import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { kendali } from "../jelajahStore";
import { aksiPetak, animasiKebun, demamAktif, jumlahPetakAktif, kebun, mulaiAksiPetak, panenKilat, punyaAlat, timbaSumur, useKebun, usirDariPetak } from "../kebun";
import { setTenaga, tenaga, TENAGA_LARI, ubahTenaga } from "../tenaga";
import { suara } from "../suaraPancing";
import { langkahKaki } from "../suasanaSuara";
import Tokoh from "../scene/Tokoh";
import { LAMA_PANJAT, akarPanjat, cariPagar } from "../scene/gerakPanjat";
import { AlatTangan } from "../scene/AlatTani";
import {
	BATAS_DUNIA, PAGAR_KEBUN, PENGHALANG_KAMERA, PENGHALANG_KEBUN, PETAK_KEBUN, SUMUR_KEBUN, TIBA_KEBUN, TITIK_PENGEPUL, TITIK_SIUMAN, TITIK_WARUNG, permukaanWilayah, petakDepan,
} from "../scene/kebunDesaData";
import { posWarga, wargaAktif } from "./wargaDesa";
import { aturDekat, pemainWilayah } from "./uiWilayah";
import { bolehTidur, desa } from "./desaHidup";

/*
 * Tokoh pemain di dunia kecamatan: jalan (WASD/joystick) relatif kamera, lari
 * (Shift), loncat (Spasi), kamera orang ketiga (seret untuk memutar, gulir
 * untuk zoom), tabrakan dengan bangunan, tenaga yang terkuras (habis = pingsan
 * lalu siuman di saung kebun, tetap di dunia ini), aksi bertani di petak di
 * depannya, dan menyapa warga / belanja di warung.
 */

const JARI = 0.35;
const GRAVITASI = 13;
const LONCAT = 4.8;
const KURAS = { dasar: 1 / 30, lari: 1 / 5 };
const tabrak = (x, z, kotak) => kotak.some((k) => x > k.x0 - JARI && x < k.x1 + JARI && z > k.z0 - JARI && z < k.z1 + JARI);

export default function PemainWilayah({ penampilan }) {
	useKebun();
	const grup = useRef();
	const badan = useRef();
	const gerak = useRef({ laju: 0, fase: 0, isyarat: null, taniU: 0, udara: false });
	const tombol = useRef(new Set());
	const loncat = useRef({ h: 0, vy: 0 });
	const pingsan = useRef(0);
	const panjat = useRef(null);
	const kamera = useRef({ yaw: TIBA_KEBUN.rot + Math.PI, pitch: 0.36, jarak: typeof window !== "undefined" && window.innerWidth < 640 ? 11.5 : 9 });
	const { gl } = useThree();
	// caping dari warung dipakai di kepala
	const rupa = useMemo(() => (punyaAlat("caping") ? { ...penampilan, topiGaya: { id: "caping", warna: "#d6b56a" } } : penampilan), [penampilan, kebun.alat.length]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		const isian = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName);
		const turun = (e) => {
			if (isian(e)) return;
			if (e.code === "Space") {
				e.preventDefault();
				if (!e.repeat) kendali.loncat = true;
				return;
			}
			if (e.code === "KeyC") {
				if (!e.repeat) kendali.jongkok = !kendali.jongkok;
				return;
			}
			if (e.code.startsWith("Arrow")) e.preventDefault();
			tombol.current.add(e.code);
		};
		const naik = (e) => tombol.current.delete(e.code);
		const lepasSemua = () => tombol.current.clear();
		window.addEventListener("keydown", turun);
		window.addEventListener("keyup", naik);
		window.addEventListener("blur", lepasSemua);
		// seret untuk memutar kamera, gulir untuk zoom
		const kanvas = gl.domElement;
		let seret = null;
		const mulai = (e) => { seret = { x: e.clientX, y: e.clientY, id: e.pointerId }; };
		const geser = (e) => {
			if (!seret || e.pointerId !== seret.id) return;
			const k = kamera.current;
			k.yaw -= (e.clientX - seret.x) * 0.006;
			k.pitch = Math.min(1.2, Math.max(0.08, k.pitch + (e.clientY - seret.y) * 0.004));
			seret.x = e.clientX; seret.y = e.clientY;
		};
		const henti = () => { seret = null; };
		const gulir = (e) => { kamera.current.jarak = Math.min(16, Math.max(3.5, kamera.current.jarak + Math.sign(e.deltaY) * 0.8)); };
		kanvas.addEventListener("pointerdown", mulai);
		window.addEventListener("pointermove", geser);
		window.addEventListener("pointerup", henti);
		kanvas.addEventListener("wheel", gulir, { passive: true });
		kendali.loncat = false;
		kendali.jongkok = false;
		return () => {
			window.removeEventListener("keydown", turun);
			window.removeEventListener("keyup", naik);
			window.removeEventListener("blur", lepasSemua);
			kanvas.removeEventListener("pointerdown", mulai);
			window.removeEventListener("pointermove", geser);
			window.removeEventListener("pointerup", henti);
			kanvas.removeEventListener("wheel", gulir);
		};
	}, [gl]);

	useFrame((state, dtMentah) => {
		const dt = Math.min(0.05, dtMentah);
		const g = grup.current;
		const p = g.position;
		const tb = tombol.current;
		const k = kamera.current;
		const an = animasiKebun();
		const gr = gerak.current;
		const l = loncat.current;
		const kini = performance.now();
		const demam = demamAktif();

		// pindah seketika (uji / kejadian), mis. { x, z, rot }
		if (kendali.teleport) {
			const t = kendali.teleport;
			kendali.teleport = null;
			panjat.current = null;
			p.set(t.x, 0, t.z);
			g.rotation.y = t.rot ?? 0;
			k.yaw = t.yaw ?? (t.rot ?? 0) + Math.PI;
		}

		// --- tenaga: terkuras perlahan, lebih cepat saat berlari; habis = pingsan ---
		const lariMau = kendali.lari || kendali.lariAnalog || tb.has("ShiftLeft") || tb.has("ShiftRight");
		const lari = lariMau && tenaga.nilai >= TENAGA_LARI && !kendali.jongkok;
		if (!pingsan.current) {
			const bergerak = Math.hypot(kendali.arah.x, kendali.arah.y) > 0.05 || ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].some((c) => tb.has(c));
			ubahTenaga(-(KURAS.dasar * (punyaAlat("caping") ? 0.65 : 1) + (lari && bergerak && !demam ? KURAS.lari : 0)) * dt);
			if (tenaga.nilai <= 0) {
				pingsan.current = kini;
				tenaga.pingsan = kini;
				pemainWilayah.pingsan = true;
				ubahTenaga(0, { teks: "😵 Anda pingsan kehabisan tenaga…", jenis: "buruk" });
			}
		} else if (kini - pingsan.current > 3200) {
			// siuman di saung kebun, digotong warga; tetap di dunia kecamatan ini
			pingsan.current = 0;
			tenaga.pingsan = false;
			pemainWilayah.pingsan = false;
			setTenaga(40);
			p.set(TITIK_SIUMAN.x, 0, TITIK_SIUMAN.z);
			g.rotation.y = TITIK_SIUMAN.rot;
			k.yaw = TITIK_SIUMAN.rot + Math.PI;
			ubahTenaga(0, { teks: "Anda siuman di saung, digotong warga. Isi tenaga di Warung Bu Imas!", jenis: "info" });
			posWarga.get("karta").ngobrol = kini + 4000;
		}
		const lemas = !!pingsan.current;

		// --- aksi dari tombol / E ---
		if (kendali.aksi) {
			const aksi = kendali.aksi;
			kendali.aksi = null;
			const hadap = (tx, tz) => { g.rotation.y = Math.atan2(tx - p.x, tz - p.z); };
			if (lemas || l.h > 0 || panjat.current) { /* tidak bisa bekerja saat pingsan / melayang / memanjat */ }
			else if (aksi === "tani:sumur") { if (timbaSumur()) hadap(SUMUR_KEBUN.x, SUMUR_KEBUN.z); }
			else if (aksi.startsWith("tani:angkut:")) {
					const i = +aksi.slice(12);
					const pk = PETAK_KEBUN[i];
					if (pk && mulaiAksiPetak(i, "panen")) hadap(pk.x, pk.z);
				} else if (aksi.startsWith("tani:petak:")) {
				const i = +aksi.slice(11);
				const pk = PETAK_KEBUN[i];
				if (pk && mulaiAksiPetak(i)) hadap(pk.x, pk.z);
			} else if (aksi.startsWith("warga:")) {
				const w = posWarga.get(aksi.slice(6));
				if (w) hadap(w.x, w.z);
			}
		}

		// --- gerak relatif kamera; dikunci selama aksi bertani & pingsan ---
		if (tb.has("KeyQ")) k.yaw += 1.8 * dt;
		if (tb.has("KeyR")) k.yaw -= 1.8 * dt;
		const kunci = an || lemas || !!desa.tidur || !!panjat.current;
		const maju = kunci ? 0 : kendali.arah.y + (tb.has("KeyW") || tb.has("ArrowUp") ? 1 : 0) - (tb.has("KeyS") || tb.has("ArrowDown") ? 1 : 0);
		const samping = kunci ? 0 : kendali.arah.x + (tb.has("KeyD") || tb.has("ArrowRight") ? 1 : 0) - (tb.has("KeyA") || tb.has("ArrowLeft") ? 1 : 0);
		const fx = -Math.sin(k.yaw), fz = -Math.cos(k.yaw);
		let dx = fx * maju + -fz * samping;
		let dz = fz * maju + fx * samping;
		const besar = Math.hypot(dx, dz);
		let laju = 0;
		if (besar > 0.05) {
			dx /= Math.max(1, besar); dz /= Math.max(1, besar);
			const v = (kendali.jongkok ? 1.8 : lari ? 6.2 : 3.6) * (demam ? 1.3 : 1) * Math.min(1, besar);
			const nx = Math.min(BATAS_DUNIA.x1, Math.max(BATAS_DUNIA.x0, p.x + dx * v * dt));
			const nz = Math.min(BATAS_DUNIA.z1, Math.max(BATAS_DUNIA.z0, p.z + dz * v * dt));
			const kotak = PENGHALANG_KEBUN;
			if (!tabrak(nx, nz, kotak)) { p.x = nx; p.z = nz; }
			else if (!tabrak(nx, p.z, kotak)) p.x = nx;
			else if (!tabrak(p.x, nz, kotak)) p.z = nz;
			const tuju = Math.atan2(dx, dz);
			let beda = tuju - g.rotation.y;
			beda = Math.atan2(Math.sin(beda), Math.cos(beda));
			g.rotation.y += beda * (1 - Math.exp(-12 * dt));
			laju = lari ? 1 : 0.65;
		}

		// --- loncat ---
		if (kendali.loncat && l.h === 0 && !kunci) {
			const bisa = (x, z) => (tabrak(x, z, PENGHALANG_KEBUN) || x < BATAS_DUNIA.x0 || x > BATAS_DUNIA.x1 || z < BATAS_DUNIA.z0 || z > BATAS_DUNIA.z1 ? null : 0);
			const pagar = !kendali.jongkok && cariPagar(PAGAR_KEBUN, p.x, 0, p.z, g.rotation.y, bisa);
			if (kendali.jongkok) kendali.jongkok = false; // Spasi saat jongkok = berdiri dulu
			else if (pagar) panjat.current = pagar;
			else { l.vy = LONCAT; suara("lompat"); ubahTenaga(-0.4); }
		}
		kendali.loncat = false;
		if (l.vy !== 0 || l.h > 0) {
			l.h += l.vy * dt;
			l.vy -= GRAVITASI * dt;
			if (l.h <= 0) { l.h = 0; l.vy = 0; langkahKaki(permukaanWilayah(p.x, p.z), true); }
		}
		gr.udara = l.h > 0.05;
		if (panjat.current) {
			if (lemas) {
				panjat.current = null;
				p.y = 0;
			}
			else {
				const md = panjat.current;
				const a = akarPanjat(md, dt);
				p.set(a.x, a.y, a.z);
				let beda = md.rot - g.rotation.y;
				beda = Math.atan2(Math.sin(beda), Math.cos(beda));
				g.rotation.y += beda * (1 - Math.exp(-14 * dt));
				if (a.u >= 1) {
					panjat.current = null;
					p.y = 0;
					langkahKaki(permukaanWilayah(p.x, p.z), false);
				}
			}
		}
		gr.panjatU = panjat.current ? Math.min(1, panjat.current.t / LAMA_PANJAT) : -1;
		gr.panjatT = panjat.current?.tinggi ?? 0;
		// jongkok ditunda selama aksi bertani yang punya pose sendiri
		gr.jongkok = (gr.jongkok ?? 0) + ((kendali.jongkok && !an && !lemas ? 1 : 0) - (gr.jongkok ?? 0)) * (1 - Math.exp(-10 * dt));
		badan.current.position.y = l.h + (lemas ? 0.15 : 0);
		badan.current.rotation.x += ((lemas ? -1.5 : 0) - badan.current.rotation.x) * (1 - Math.exp(-6 * dt));

		const tapak = Math.floor(gr.fase / Math.PI);
		gr.laju += (laju - gr.laju) * (1 - Math.exp(-10 * dt));
		gr.fase += dt * (lari ? 12 : kendali.jongkok ? 6.5 : 8.5) * gr.laju;
		if (laju && !gr.udara && !kendali.jongkok && Math.floor(gr.fase / Math.PI) !== tapak) langkahKaki(permukaanWilayah(p.x, p.z), lari);
		gr.isyarat = an ? (an.jenis === "gali" ? "cangkul" : an.jenis) : null;
		gr.taniU = an ? (kini - an.mulai) / (an.sampai - an.mulai) : 0;

		pemainWilayah.x = p.x;
		pemainWilayah.z = p.z;
		pemainWilayah.y = p.y;
		pemainWilayah.lari = !!(lari && laju);
		pemainWilayah.udara = !!gr.udara;
		pemainWilayah.pose = panjat.current ? "panjat" : kendali.jongkok ? "jongkok" : "jalan";
		pemainWilayah.pu = +Math.max(0, gr.panjatU).toFixed(2);
		pemainWilayah.pt = gr.panjatT;
		pemainWilayah.rot = g.rotation.y;
		pemainWilayah.yaw = k.yaw;

		// berlari menerjang petak membuat burung pipit kabur
		if (lari && laju && !gr.udara) {
			const aktif = jumlahPetakAktif();
			for (let i = 0; i < aktif; i++) {
				const pk = PETAK_KEBUN[i];
				if (kebun.petak[i].burung && Math.abs(pk.x - p.x) < 2.3 && Math.abs(pk.z - p.z) < 2.3) usirDariPetak(i, true);
			}
		}

		// Demam: yang siap langsung terpanen saat diterjang
		if (demam && !lemas) {
			const aktif = jumlahPetakAktif();
			for (let i = 0; i < aktif; i++) {
				const pk = PETAK_KEBUN[i];
				if (Math.abs(pk.x - p.x) < 2.4 && Math.abs(pk.z - p.z) < 2.4) panenKilat(i);
			}
		}

		// --- kamera orang ketiga: tidak menembus tanah, maju bila terhalang atap/gapura ---
		const cam = state.camera;
		const ax = Math.sin(k.yaw) * Math.cos(k.pitch), az = Math.cos(k.yaw) * Math.cos(k.pitch), ay = Math.sin(k.pitch);
		let jarak = k.jarak;
		for (let t = 0.12; t <= 1; t += 0.04) {
			const d = t * k.jarak;
			const sx = p.x + ax * d, sz = p.z + az * d, sy = 1.6 + ay * d;
			if (PENGHALANG_KAMERA.some((b) => sx > b.x0 && sx < b.x1 && sz > b.z0 && sz < b.z1 && sy < b.h && sy > (b.y0 ?? 0))) { jarak = Math.max(1.6, d - 0.5); break; }
		}
		kamera.current.jarakNyata = (kamera.current.jarakNyata ?? jarak) + (jarak - (kamera.current.jarakNyata ?? jarak)) * (jarak < (kamera.current.jarakNyata ?? jarak) ? 0.5 : 1 - Math.exp(-3 * dt));
		const jn = kamera.current.jarakNyata;
		const cx = p.x + ax * jn;
		const cz = p.z + az * jn;
		const cy = Math.max(0.6, 1.6 + ay * jn + l.h * 0.4);
		const a = 1 - Math.exp(-7 * dt);
		cam.position.x += (cx - cam.position.x) * a;
		cam.position.y += (cy - cam.position.y) * a;
		cam.position.z += (cz - cam.position.z) * a;
		// getaran saat panen & pandangan melebar saat Demam
		if (kebun.getar > 0) {
			cam.position.x += (Math.random() - 0.5) * kebun.getar * 0.3;
			cam.position.y += (Math.random() - 0.5) * kebun.getar * 0.3;
			kebun.getar = Math.max(0, kebun.getar - dt * 3.5);
		}
		const lebar = demam ? 60 : 50;
		if (Math.abs(cam.fov - lebar) > 0.05) { cam.fov += (lebar - cam.fov) * (1 - Math.exp(-5 * dt)); cam.updateProjectionMatrix(); }
		cam.lookAt(p.x, 1.3 + l.h * 0.5, p.z);

		// --- tombol aksi terdekat: warga & tempat lebih dulu, lalu petak di depan ---
		let dekat = null, depan = null;
		if (!an && !lemas && !desa.tidur) {
			let ayam = -1, jarakAyam = 1.6;
			desa.ayam.forEach((a, i) => { const d = Math.hypot(a.x - p.x, a.z - p.z); if (!a.tertangkap && d < jarakAyam) { jarakAyam = d; ayam = i; } });
			if (ayam >= 0) dekat = `ayam:${ayam}`;
			else if (bolehTidur() && Math.hypot(TITIK_SIUMAN.x - p.x, TITIK_SIUMAN.z - p.z) < 3) dekat = "tidur";
			else if (Math.hypot(SUMUR_KEBUN.x - p.x, SUMUR_KEBUN.z - p.z) < 2.4) dekat = "tani:sumur";
			else if (Math.hypot(TITIK_PENGEPUL.x - p.x, TITIK_PENGEPUL.z - p.z) < 1.9) dekat = "tani:jual";
			else if (Math.hypot(TITIK_WARUNG.x - p.x, TITIK_WARUNG.z - p.z) < 2) dekat = "warung";
			else {
				const pk = petakDepan(p.x, p.z, g.rotation.y, jumlahPetakAktif());
				if (pk) depan = pk.id;
				if (pk && aksiPetak(pk.id)?.jenis) dekat = `tani:petak:${pk.id}`;
				if (!dekat) {
					let terdekat = 2.4;
					for (const w of wargaAktif()) {
						if (w.toko || w.jual) continue;
						const pw = posWarga.get(w.id);
						const d = Math.hypot(pw.x - p.x, pw.z - p.z);
						if (d < terdekat) { terdekat = d; dekat = `warga:${w.id}`; }
					}
				}
			}
		}
		aturDekat(dekat, depan);
	});

	return (
		<group ref={grup} position={[TIBA_KEBUN.x, 0, TIBA_KEBUN.z]} rotation-y={TIBA_KEBUN.rot}>
			<group ref={badan}>
				<Tokoh penampilan={rupa} pose="jalan" gerak={gerak} alat={<AlatTangan />} />
			</group>
		</group>
	);
}
