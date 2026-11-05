import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, BufferGeometry, CanvasTexture, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, MeshBasicMaterial, MeshStandardMaterial, Path, PlaneGeometry, SRGBColorSpace, Shape, ShapeGeometry, SpriteMaterial } from "three";
import { BAHAN_WARNA, gabung, kotak, warnai } from "./geometri";
import { AIR_Y } from "./situ";

// Bentuk kapal di air: perahu dayung (geometri bersama), jetski, dan kapal milik tamu dari
// Toko Perahu (kano, sampan, fiber, speedboat, jetski). Dipakai SituPemda & pratinjau toko.

// Garis lambung dilihat dari atas (x = samping, z = haluan ke +z).
const LAMBUNG = [
	[0, 1.5],
	[0.5, 1.0],
	[0.64, 0.2],
	[0.6, -0.8],
	[0.46, -1.35],
	[-0.46, -1.35],
	[-0.6, -0.8],
	[-0.64, 0.2],
	[-0.5, 1.0],
];
const keShape = (titik, skala = 1) => titik.map(([x, z]) => ({ x: x * skala, y: -z * skala }));

function geometriPerahu() {
	const luar = new Shape(keShape(LAMBUNG));
	luar.holes.push(new Path(keShape(LAMBUNG, 0.9).reverse()));
	const dinding = new ExtrudeGeometry(luar, { depth: 0.46, bevelEnabled: false });
	dinding.rotateX(-Math.PI / 2);
	dinding.translate(0, -0.2, 0);
	const lantai = new ShapeGeometry(new Shape(keShape(LAMBUNG, 0.92)));
	lantai.rotateX(-Math.PI / 2);
	lantai.translate(0, -0.1, 0);
	const badan = warnai(dinding, "#ffffff"); // dicat per perahu lewat warna bahan
	const isi = warnai(lantai, "#9c6b40");
	const bangku = gabung([-0.55, 0.75].map((z) => warnai(new CylinderGeometry(0.06, 0.06, 1.1, 6), "#7b4f2e", { p: [0, 0.06, z], r: [0, 0, Math.PI / 2] })));
	return { badan, isi, bangku };
}
const GEO_PERAHU = geometriPerahu();
const GEO_DAYUNG = gabung([
	warnai(new CylinderGeometry(0.03, 0.03, 2.1, 6), "#a47148", { r: [0, 0, Math.PI / 2], p: [0.75, 0, 0] }),
	warnai(new CylinderGeometry(0.02, 0.02, 0.01, 4), "#a47148"),
	warnai(new CylinderGeometry(0.16, 0.16, 0.04, 8), "#c9a06b", { s: [1, 1, 2.2], r: [0, 0, Math.PI / 2], p: [1.75, 0, 0] }),
]);

// ---------- perahu dayung gratis ----------

export function Perahu({ k, i }) {
	const g = useRef();
	const dayung = useRef([]);
	const bahan = useMemo(() => new MeshStandardMaterial({ color: k.warna, roughness: 0.6 }), [k.warna]);
	const fase = useRef(0);
	useFrame(({ clock }, dt) => {
		const t = clock.elapsedTime;
		const o = g.current;
		o.position.set(k.x, AIR_Y + Math.sin(t * 1.3 + i) * 0.035, k.z);
		o.rotation.set(Math.sin(t * 0.9 + i) * 0.02, k.rot, Math.sin(t * 1.1 + i * 2) * 0.03 - k.setir * Math.min(1, Math.abs(k.laju) / 3) * 0.05);
		// mendayung: ayunan bolak-balik secepat lajunya; diam = dayung disandarkan
		fase.current += dt * Math.min(6, Math.abs(k.laju) * 1.6) * Math.sign(k.laju || 1);
		const gerak = Math.abs(k.laju) > 0.15;
		dayung.current.forEach((dy, sisi) => {
			if (!dy) return;
			const s = sisi ? 1 : -1;
			const sapu = gerak ? Math.sin(fase.current) * 0.55 : 0.9;
			dy.rotation.set(0, s > 0 ? -sapu : Math.PI + sapu, gerak ? -0.25 + Math.cos(fase.current) * 0.18 : -0.05);
		});
	});
	return (
		<group ref={g}>
			<mesh geometry={GEO_PERAHU.badan} material={bahan} />
			<mesh geometry={GEO_PERAHU.isi} material={BAHAN_WARNA} />
			<mesh geometry={GEO_PERAHU.bangku} material={BAHAN_WARNA} />
			{[0, 1].map((sisi) => (
				<group key={sisi} position={[sisi ? 0.6 : -0.6, 0.27, -0.25]} ref={(el) => (dayung.current[sisi] = el)}>
					<mesh geometry={GEO_DAYUNG} material={BAHAN_WARNA} />
				</group>
			))}
		</group>
	);
}

// ---------- jetski ----------

// Badan melengkung dari irisan melintang: [z, setengah lebar, y bawah, y atas], lunas V di bawah.
function loft(irisan, n = 18) {
	const pos = [];
	const idx = [];
	for (const [z, w, yb, yt] of irisan) {
		const tengah = (yb + yt) / 2;
		const tinggi = (yt - yb) / 2;
		for (let i = 0; i < n; i++) {
			const a = (i / n) * Math.PI * 2;
			const c = Math.cos(a);
			const s = Math.sin(a);
			// pangkat < 1 membuat irisan membulat-kotak (lambung), bukan elips
			pos.push(Math.sign(c) * Math.abs(c) ** 0.65 * w, tengah + Math.sign(s) * Math.abs(s) ** 0.8 * tinggi, z);
		}
	}
	for (let r = 0; r < irisan.length - 1; r++) {
		for (let i = 0; i < n; i++) {
			const a = r * n + i;
			const b = r * n + ((i + 1) % n);
			const c = a + n;
			const d = b + n;
			idx.push(a, b, c, b, d, c);
		}
	}
	// tutup kedua ujung
	for (const [r, balik] of [[0, true], [irisan.length - 1, false]]) {
		const [z, , yb, yt] = irisan[r];
		const pusat = pos.length / 3;
		pos.push(0, (yb + yt) / 2, z);
		for (let i = 0; i < n; i++) {
			const a = r * n + i;
			const b = r * n + ((i + 1) % n);
			if (balik) idx.push(pusat, b, a);
			else idx.push(pusat, a, b);
		}
	}
	const g = new BufferGeometry();
	g.setAttribute("position", new Float32BufferAttribute(pos, 3));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}

const GEO_JETSKI = {
	bawah: loft([[-1.22, 0.31, 0.04, 0.2], [-0.9, 0.39, 0.0, 0.2], [-0.2, 0.44, -0.02, 0.2], [0.5, 0.41, 0.0, 0.21], [1.0, 0.27, 0.05, 0.23], [1.32, 0.13, 0.12, 0.25], [1.5, 0.02, 0.2, 0.26]]),
	bibir: loft([[-1.24, 0.325, 0.18, 0.225], [-0.9, 0.405, 0.18, 0.225], [-0.2, 0.455, 0.18, 0.225], [0.5, 0.425, 0.19, 0.235], [1.0, 0.285, 0.21, 0.255], [1.34, 0.14, 0.23, 0.275], [1.52, 0.025, 0.25, 0.285]]),
	dek: loft([[-1.18, 0.27, 0.2, 0.31], [-0.9, 0.35, 0.2, 0.33], [-0.2, 0.4, 0.2, 0.34], [0.5, 0.37, 0.21, 0.38], [1.0, 0.23, 0.23, 0.39], [1.3, 0.1, 0.25, 0.36], [1.46, 0.015, 0.26, 0.3]]),
	kap: loft([[0.02, 0.06, 0.3, 0.42], [0.2, 0.2, 0.3, 0.56], [0.5, 0.25, 0.3, 0.6], [0.8, 0.2, 0.3, 0.54], [1.05, 0.11, 0.3, 0.45], [1.2, 0.02, 0.32, 0.38]]),
	jok: loft([[-1.0, 0.1, 0.3, 0.42], [-0.8, 0.19, 0.3, 0.49], [-0.3, 0.2, 0.3, 0.5], [0.0, 0.17, 0.3, 0.5], [0.16, 0.08, 0.32, 0.46]]),
	nosel: new CylinderGeometry(0.05, 0.075, 0.12, 12).rotateX(Math.PI / 2),
	tiang: new CylinderGeometry(0.03, 0.04, 0.16, 8),
	setang: new CylinderGeometry(0.014, 0.014, 0.62, 8).rotateZ(Math.PI / 2),
	pegangan: new CylinderGeometry(0.024, 0.024, 0.13, 8).rotateZ(Math.PI / 2),
	kaca: new BoxGeometry(0.34, 0.15, 0.015),
	jejak: new PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
};
const BAHAN_LAMBUNG = new MeshStandardMaterial({ color: "#f1f5f9", roughness: 0.32, metalness: 0.1 });
const BAHAN_GELAP = new MeshStandardMaterial({ color: "#111827", roughness: 0.6 });
const BAHAN_KACA = new MeshStandardMaterial({ color: "#0f172a", roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.55 });

// Jejak buih: tekstur V yang memudar ke belakang, dibuat sekali saja.
const TEKSTUR_JEJAK = (() => {
	if (typeof document === "undefined") return null;
	const c = document.createElement("canvas");
	c.width = 128;
	c.height = 256;
	const g = c.getContext("2d");
	g.filter = "blur(3px)";
	// u = 0 di buritan (bawah kanvas, ujung lancip V), u = 1 jauh di belakang (atas kanvas)
	for (let i = 0; i < 520; i++) {
		const u = Math.random();
		const sisi = i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : -1;
		const x = 64 + sisi * (4 + u * 54) + (Math.random() - 0.5) * (sisi ? 7 + u * 8 : 12 + u * 26);
		const r = 1.5 + Math.random() * (sisi ? 4 : 5);
		g.fillStyle = `rgba(255,255,255,${(1 - u) ** 1.3 * (sisi ? 0.95 : 0.6)})`;
		g.beginPath();
		g.arc(x, 250 - u * 244, r, 0, Math.PI * 2);
		g.fill();
	}
	const t = new CanvasTexture(c);
	t.colorSpace = SRGBColorSpace;
	return t;
})();
const BAHAN_JEJAK = new MeshBasicMaterial({ map: TEKSTUR_JEJAK, transparent: true, opacity: 0, depthWrite: false });
// Semburan: kabut air berupa sprite bertepi lembut, bukan bola.
const TEKSTUR_KABUT = (() => {
	if (typeof document === "undefined") return null;
	const c = document.createElement("canvas");
	c.width = c.height = 48;
	const g = c.getContext("2d");
	const r = g.createRadialGradient(24, 24, 1, 24, 24, 24);
	r.addColorStop(0, "rgba(255,255,255,.95)");
	r.addColorStop(0.45, "rgba(255,255,255,.45)");
	r.addColorStop(1, "rgba(255,255,255,0)");
	g.fillStyle = r;
	g.fillRect(0, 0, 48, 48);
	return new CanvasTexture(c);
})();
const BAHAN_SEMBURAN = new SpriteMaterial({ map: TEKSTUR_KABUT, transparent: true, opacity: 0.7, depthWrite: false });
const N_SEMBURAN = 14;

// Jejak buih di belakang kapal bermesin: mengikuti air (tidak ikut miring), 0,03 di atas
// permukaan supaya tidak berkedip. buritan = jarak buritan dari titik tengah kapal.
function Jejak({ k, buritan }) {
	const m = useRef();
	const bahan = useMemo(() => BAHAN_JEJAK.clone(), []);
	useFrame(() => {
		const cepat = Math.min(1, Math.abs(k.laju) / 9);
		const j = m.current;
		j.visible = k.laju > 0.8;
		if (!j.visible) return;
		const panjang = 1.5 + cepat * 6;
		j.position.set(k.x - Math.sin(k.rot) * (buritan + panjang / 2), AIR_Y + 0.03, k.z - Math.cos(k.rot) * (buritan + panjang / 2));
		j.rotation.y = k.rot;
		j.scale.set(0.9 + cepat * 2.2, 1, panjang);
		bahan.opacity = 0.35 + cepat * 0.5;
	});
	return <mesh ref={m} geometry={GEO_JETSKI.jejak} material={bahan} visible={false} />;
}

export function Jetski({ k, i }) {
	const g = useRef();
	const semburan = useRef([]);
	const bahan = useMemo(() => new MeshStandardMaterial({ color: k.warna, roughness: 0.28, metalness: 0.3 }), [k.warna]);
	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		const laju = Math.abs(k.laju);
		const cepat = Math.min(1, laju / 9);
		const o = g.current;
		o.position.set(k.x, AIR_Y + Math.sin(t * 1.6 + i) * 0.025 + cepat * (0.05 + Math.sin(t * 13) * 0.018), k.z);
		// moncong terangkat saat melaju, badan rebah ke arah belokan
		o.rotation.set(-cepat * 0.11 + Math.sin(t * 1.1 + i) * 0.012, k.rot, -k.setir * cepat * 0.34);
		// semburan air dari nosel: butir melengkung ke belakang lalu jatuh
		semburan.current.forEach((b, n) => {
			if (!b) return;
			b.visible = k.laju > 1.5;
			if (!b.visible) return;
			const u = ((t * 1.7 + n / N_SEMBURAN) % 1);
			const tinggi = (0.12 + cepat * 0.5) * Math.sin(u * Math.PI);
			b.position.set(Math.sin(n * 7.3) * 0.12 * (1 + u * 1.5), 0.1 + tinggi, -1.28 - u * (0.6 + cepat * 1.5));
			b.scale.setScalar((0.16 + u * 0.34) * (0.55 + cepat * 0.6));
		});
	});
	return (
		<>
			<group ref={g}>
				<mesh geometry={GEO_JETSKI.bawah} material={BAHAN_LAMBUNG} />
				<mesh geometry={GEO_JETSKI.bibir} material={BAHAN_GELAP} />
				<mesh geometry={GEO_JETSKI.dek} material={bahan} />
				<mesh geometry={GEO_JETSKI.kap} material={bahan} />
				<mesh geometry={GEO_JETSKI.jok} material={BAHAN_GELAP} />
				<mesh geometry={GEO_JETSKI.nosel} material={BAHAN_GELAP} position={[0, 0.13, -1.24]} />
				<mesh geometry={GEO_JETSKI.kaca} material={BAHAN_KACA} position={[0, 0.66, 0.42]} rotation-x={-0.5} />
				<mesh geometry={GEO_JETSKI.tiang} material={BAHAN_GELAP} position={[0, 0.6, 0.27]} />
				<mesh geometry={GEO_JETSKI.setang} material={BAHAN_GELAP} position={[0, 0.68, 0.27]} />
				{[-1, 1].map((s) => (
					<mesh key={s} geometry={GEO_JETSKI.pegangan} material={BAHAN_GELAP} position={[s * 0.3, 0.68, 0.27]} />
				))}
				{Array.from({ length: N_SEMBURAN }, (_, n) => (
					<sprite key={n} ref={(el) => (semburan.current[n] = el)} material={BAHAN_SEMBURAN} visible={false} />
				))}
			</group>
			<Jejak k={k} buritan={1.2} />
		</>
	);
}


// ---------- kapal milik tamu (Toko Perahu) ----------

// Cincin dinding lambung setebal `tebal` mulai y0; skala luar/dalam terhadap LAMBUNG.
function cincin(luarSkala, dalamSkala, y0, tebal) {
	const luar = new Shape(keShape(LAMBUNG, luarSkala));
	luar.holes.push(new Path(keShape(LAMBUNG, dalamSkala).reverse()));
	const g = new ExtrudeGeometry(luar, { depth: tebal, bevelEnabled: false });
	g.rotateX(-Math.PI / 2);
	g.translate(0, y0, 0);
	return g;
}
const GEO_KAPAL = {
	// pita warna di sisi luar lambung fiber; menjorok 2% ke luar supaya tidak koplanar
	pita: warnai(cincin(1.02, 0.97, 0.04, 0.12), "#ffffff"),
	// dek haluan speedboat: segitiga di ujung lambung, sedikit di atas bibir dinding
	dek: (() => {
		const g = new ExtrudeGeometry(new Shape(keShape([[-0.5, 1.0], [0.5, 1.0], [0, 1.5]], 0.98)), { depth: 0.06, bevelEnabled: false });
		g.rotateX(-Math.PI / 2);
		g.translate(0, 0.28, 0);
		return warnai(g, "#f1f5f9");
	})(),
	jok: gabung([-0.55, 0.75].map((z) => kotak([0.7, 0.12, 0.34], "#1f2937", [0, 0.06, z]))),
	motorTempel: gabung([
		kotak([0.22, 0.36, 0.26], "#dc2626", [0, 0.28, 0]),
		kotak([0.06, 0.5, 0.1], "#9ca3af", [0, -0.1, -0.04]),
		kotak([0.2, 0.06, 0.14], "#6b7280", [0, -0.34, -0.04]),
		kotak([0.04, 0.04, 0.2], "#374151", [0, 0.48, 0.1]),
	]),
	konsol: gabung([
		kotak([0.56, 0.46, 0.22], "#e2e8f0", [0, 0.13, 0]),
		kotak([0.5, 0.04, 0.2], "#334155", [0, 0.38, 0.0]),
		warnai(new CylinderGeometry(0.1, 0.1, 0.02, 14), "#111827", { p: [0, 0.34, -0.16], r: [Math.PI / 2 - 0.5, 0, 0] }),
	]),
	kacaDepan: new BoxGeometry(0.62, 0.3, 0.02),
};

function KapalMilik({ k, i }) {
	const g = useRef();
	const dayung = useRef();
	const fase = useRef(0);
	const bahan = useMemo(() => new MeshStandardMaterial({ color: k.warna, roughness: 0.45, metalness: 0.1 }), [k.warna]);
	const id = k.model;
	const mesin = !!k.bermesin;
	// skala lambung per model: [lebar, tinggi, panjang]
	const skala = { kano: [0.6, 0.85, 1.12], sampan: [1.2, 1, 1.05], fiber: [1, 1.05, 1.1], speedboat: [0.92, 1, 1.15] }[id] || [1, 1, 1];
	const buritan = 1.35 * skala[2];
	useFrame(({ clock }, dt) => {
		const t = clock.elapsedTime;
		const cepat = mesin ? Math.min(1, Math.abs(k.laju) / 9) : 0;
		const o = g.current;
		o.position.set(k.x, AIR_Y + Math.sin(t * 1.3 + i) * 0.035, k.z);
		// moncong terangkat saat melaju (bermesin), rebah ke arah belokan
		o.rotation.set(-cepat * 0.07 + Math.sin(t * 0.9 + i) * 0.02, k.rot, Math.sin(t * 1.1 + i * 2) * 0.03 - k.setir * Math.min(1, Math.abs(k.laju) / 3) * 0.05);
		if (dayung.current) {
			fase.current += dt * Math.min(6, Math.abs(k.laju) * 1.6) * Math.sign(k.laju || 1);
			const gerak = Math.abs(k.laju) > 0.15;
			const sapu = gerak ? Math.sin(fase.current) * 0.55 : 0.9;
			dayung.current.rotation.set(0, -sapu, gerak ? -0.25 + Math.cos(fase.current) * 0.18 : -0.05);
		}
	});
	return (
		<>
			<group ref={g}>
				<group scale={skala}>
					<mesh geometry={GEO_PERAHU.badan} material={id === "fiber" ? BAHAN_LAMBUNG : bahan} />
					<mesh geometry={GEO_PERAHU.isi} material={BAHAN_WARNA} />
					{id === "fiber" && <mesh geometry={GEO_KAPAL.pita} material={bahan} />}
					{id === "speedboat" && <mesh geometry={GEO_KAPAL.dek} material={BAHAN_WARNA} />}
				</group>
				{id === "speedboat" ? <mesh geometry={GEO_KAPAL.jok} material={BAHAN_WARNA} /> : <mesh geometry={GEO_PERAHU.bangku} material={BAHAN_WARNA} scale={[skala[0], 1, 1]} />}
				{id === "kano" && (
					<group ref={dayung} position={[0.3, 0.27, -0.2]}>
						<mesh geometry={GEO_DAYUNG} material={BAHAN_WARNA} />
					</group>
				)}
				{id === "sampan" && <mesh geometry={GEO_KAPAL.motorTempel} material={BAHAN_WARNA} position={[0, 0.02, -buritan - 0.1]} />}
				{id === "fiber" && (
					<>
						<mesh geometry={GEO_KAPAL.konsol} material={BAHAN_WARNA} position={[0, -0.05, 0.12]} />
						<mesh geometry={GEO_KAPAL.motorTempel} material={BAHAN_WARNA} position={[0, 0.02, -buritan - 0.1]} scale={1.2} />
					</>
				)}
				{id === "speedboat" && (
					<>
						<mesh geometry={GEO_KAPAL.kacaDepan} material={BAHAN_KACA} position={[0, 0.46, 1.2]} rotation-x={-0.45} />
						{[-0.3, 0.3].map((x) => (
							<mesh key={x} geometry={GEO_KAPAL.motorTempel} material={BAHAN_WARNA} position={[x, 0.02, -buritan - 0.1]} scale={0.9} />
						))}
					</>
				)}
			</group>
			{mesin && <Jejak k={k} buritan={buritan + 0.2} />}
		</>
	);
}

// Kapal milik tamu menurut modelnya (jetski memakai bentuknya sendiri).
export const KapalTamu = ({ k, i }) => (k.jetski ? <Jetski k={k} i={i} /> : <KapalMilik k={k} i={i} />);
