import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Raycaster, Vector3 } from "three";
import { BENDA, LOBI, RUANGAN, TINGGI_LANTAI, TITIK_MULAI, cariArea } from "../kantorConfig";
import { kendali, posisi, setKeadaan } from "../jelajahStore";
import { KENDARAAN, kendaraanDariId, keDunia, lingkaran, resetKendaraan, tabrakKendaraan, titikNaik } from "./kendaraan";
import { PERABOT, TANAH, cariJalur, langkah, tabrakKendaraanStatis, tanggaDi, tinggiTanah } from "./layout";
import { diriSendiri, kendaraanDipakaiLain, pemainLain } from "../multipemain";
import Tokoh from "./Tokoh";

const H = TINGGI_LANTAI;
const PETUGAS = [LOBI, ...RUANGAN];
const JARAK_SAPA = 3.8;
const JARAK_BENDA = 1.6;
const JARAK_KURSI = 0.95;
const JARAK_MOBIL = 1.3;
const JARAK_MOTOR = 1.1;
const JARAK_TAMU = 2.2;
const KECEPATAN = { jalan: 3.8, lari: 6.8 };
const GRAVITASI = 13;
const LONCAT = 4.6;
const TOMBOL_GERAK = new Set([
	"KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight",
]);
// Pengunjung: kemeja kasual (bukan seragam), supaya beda dari pegawai. Bila tamu sudah
// memilih avatar, penampilan dari pilihannya dipakai.
const PENAMPILAN_BAWAAN = { seragam: "warga", perempuan: false, kulit: "#d9ad85", rambut: "#20160f", baju: "#e0703a", celana: "#1e3a5f" };
// Pengaturan berkendara: laju maksimum (m/s), percepatan, jarak sumbu roda.
const KEMUDI = {
	mobil: { maju: 10, turbo: 15, mundur: 4, gas: 6, rem: 12, sumbu: 2.6, belok: 0.55 },
	motor: { maju: 12, turbo: 18, mundur: 2.5, gas: 8, rem: 14, sumbu: 1.3, belok: 0.6 },
};

const sudutDekat = (dari, ke) => dari + Math.atan2(Math.sin(ke - dari), Math.cos(ke - dari));
const KURSI = PERABOT.filter((p) => ["kursi", "kursiEksekutif", "sofa"].includes(p.jenis));

export default function Pemain({ daftarDinding, penghuni, penampilan = PENAMPILAN_BAWAAN }) {
	const grup = useRef();
	const badanLoncat = useRef();
	const tokohJalan = useRef();
	const tokohDuduk = useRef();
	const penandaTujuan = useRef();
	const bidangKlik = useRef();
	const gerak = useRef({ laju: 0, fase: 0, udara: false, isyarat: null });
	const tombol = useRef(new Set());
	const rute = useRef(null);
	const macet = useRef(0);
	const loncat = useRef({ h: 0, vy: 0 });
	// mode: jalan | duduk | masuk | kemudi | turun
	const mode = useRef({ jenis: "jalan", t: 0, k: null, kursi: null, dari: null });
	const kamera = useRef({ yaw: TITIK_MULAI.yaw, pitch: 0.55, jarak: 10, luar: 1, lompat: true });
	const bantu = useMemo(() => ({ ray: new Raycaster(), arah: new Vector3(), kepala: new Vector3(), lihat: new Vector3(), fokus: new Vector3() }), []);
	const { camera, gl } = useThree();

	// Kursi & sofa yang tidak sedang diduduki pegawai.
	const kursiBebas = useMemo(() => {
		const terisi = (penghuni?.orang || []).filter((o) => o.pose === "duduk");
		return KURSI.filter((k) => !terisi.some((o) => o.lantai === k.lantai && Math.hypot(o.x - k.x, o.z - k.z) < 0.35)).map((k, i) => ({ ...k, id: `kursi:${i}` }));
	}, [penghuni]);

	useEffect(() => {
		kamera.current.jarak = window.innerWidth < 640 ? 12 : 10;
		resetKendaraan();
	}, []);

	// Keyboard: tombol gerak & Spasi (loncat) ditangani di sini; E/Esc/M milik UI.
	useEffect(() => {
		const turun = (e) => {
			if (e.target.closest?.("input, textarea, [contenteditable], button")) return;
			if (e.code === "Space") {
				e.preventDefault();
				if (!e.repeat) kendali.loncat = true;
				return;
			}
			if (!TOMBOL_GERAK.has(e.code)) return;
			if (e.code.startsWith("Arrow")) e.preventDefault();
			tombol.current.add(e.code);
		};
		const naik = (e) => tombol.current.delete(e.code);
		const lepasSemua = () => tombol.current.clear();
		window.addEventListener("keydown", turun);
		window.addEventListener("keyup", naik);
		window.addEventListener("blur", lepasSemua);
		return () => {
			window.removeEventListener("keydown", turun);
			window.removeEventListener("keyup", naik);
			window.removeEventListener("blur", lepasSemua);
		};
	}, []);

	// Seret di kanvas untuk memutar kamera, roda mouse untuk zoom.
	useEffect(() => {
		const el = gl.domElement;
		let aktif = null;
		const turun = (e) => {
			if (aktif !== null) return;
			aktif = { id: e.pointerId, x: e.clientX, y: e.clientY };
		};
		const gerakPointer = (e) => {
			if (!aktif || e.pointerId !== aktif.id) return;
			const k = kamera.current;
			k.yaw -= (e.clientX - aktif.x) * 0.006;
			k.pitch = Math.min(1.2, Math.max(0.3, k.pitch + (e.clientY - aktif.y) * 0.004));
			aktif.x = e.clientX;
			aktif.y = e.clientY;
		};
		const naik = (e) => {
			if (aktif && e.pointerId === aktif.id) aktif = null;
		};
		const roda = (e) => {
			e.preventDefault();
			const k = kamera.current;
			k.jarak = Math.min(15, Math.max(5, k.jarak + e.deltaY * 0.01));
		};
		el.addEventListener("pointerdown", turun);
		window.addEventListener("pointermove", gerakPointer);
		window.addEventListener("pointerup", naik);
		window.addEventListener("pointercancel", naik);
		el.addEventListener("wheel", roda, { passive: false });
		return () => {
			el.removeEventListener("pointerdown", turun);
			window.removeEventListener("pointermove", gerakPointer);
			window.removeEventListener("pointerup", naik);
			window.removeEventListener("pointercancel", naik);
			el.removeEventListener("wheel", roda);
		};
	}, [gl]);

	useFrame((_, dtMentah) => {
		// Dibatasi 0,1 detik: di HP yang hanya 10–20 fps langkah tetap normal, dan lompatan
		// terjauh (lari, 0,68 m) masih lebih pendek dari tebal dinding + badan, jadi tak menembus.
		const dt = Math.min(dtMentah, 0.1);
		const g = grup.current;
		const p = g.position;
		const k = kamera.current;
		const m = mode.current;

		if (kendali.teleport) {
			const t = kendali.teleport;
			if (m.jenis !== "jalan") {
				if (m.k) {
					m.k.laju = 0;
					m.k.pintu = 0;
					if (m.k.jenis === "motor") m.k.miring = 0.12;
				}
				mode.current = { jenis: "jalan", t: 0, k: null, kursi: null, dari: null };
			}
			p.set(t.x, t.lantai ? t.lantai * H : tinggiTanah(t.x, t.z), t.z);
			g.rotation.y = t.rot;
			k.yaw = t.yaw;
			k.lompat = true;
			kendali.teleport = null;
			kendali.target = null;
			rute.current = null;
		}

		// --- masukan: keyboard + joystick ---
		const tb = tombol.current;
		const maju = kendali.arah.y + (tb.has("KeyW") || tb.has("ArrowUp") ? 1 : 0) - (tb.has("KeyS") || tb.has("ArrowDown") ? 1 : 0);
		const samping = kendali.arah.x + (tb.has("KeyD") || tb.has("ArrowRight") ? 1 : 0) - (tb.has("KeyA") || tb.has("ArrowLeft") ? 1 : 0);
		const lari = kendali.lari || kendali.lariAnalog || tb.has("ShiftLeft") || tb.has("ShiftRight");
		if (kendali.putar) k.yaw -= kendali.putar * 1.8 * dt;

		// --- aksi dari UI (E / tombol): duduk, berdiri, naik/turun kendaraan ---
		if (kendali.aksi) {
			const aksi = kendali.aksi;
			kendali.aksi = null;
			const md = mode.current;
			if (md.jenis === "jalan" && aksi.startsWith("kursi:")) {
				const kursi = kursiBebas.find((c) => c.id === aksi);
				if (kursi) {
					mode.current = { jenis: "duduk", t: 0, k: null, kursi, dari: { x: p.x, z: p.z } };
					rute.current = null;
				}
			} else if (md.jenis === "jalan" && (aksi.startsWith("mobil:") || aksi.startsWith("motor:"))) {
				const kend = kendaraanDariId(aksi);
				if (kend) {
					mode.current = { jenis: "masuk", t: 0, k: kend, kursi: null, dari: { x: p.x, z: p.z } };
					rute.current = null;
				}
			} else if (aksi === "berdiri" && md.jenis === "duduk") {
				berdiri();
			} else if (aksi === "keluar" && md.jenis === "kemudi") {
				mode.current = { ...md, jenis: "turun", t: 0 };
			}
		}

		function berdiri() {
			const c = mode.current.kursi;
			const depan = { x: c.x + Math.sin(c.rot) * 0.75, z: c.z + Math.cos(c.rot) * 0.75 };
			const lantaiY = c.lantai * H;
			const ok = langkah(lantaiY, depan.x, depan.z) !== null && !tabrakKendaraan(depan.x, depan.z, 0.38);
			const ke = ok ? depan : mode.current.dari;
			p.set(ke.x, lantaiY, ke.z);
			mode.current = { jenis: "jalan", t: 0, k: null, kursi: null, dari: null };
		}

		let besar = 0;
		const jenisMode = mode.current.jenis;

		if (jenisMode === "jalan") {
			if (kendali.target) {
				const t = kendali.target;
				const lantaiKini = p.y > H / 2 ? 1 : 0;
				const titik = cariJalur({ x: p.x, z: p.z, lantai: lantaiKini }, { x: t.x, z: t.z, lantai: t.lantai ?? lantaiKini });
				rute.current = titik?.length ? { titik, buka: t.buka } : null;
				if (!titik?.length && t.buka) setKeadaan({ minta: `${t.buka}:${performance.now()}` });
				kendali.target = null;
			}

			// arah gerak relatif terhadap kamera
			const sy = Math.sin(k.yaw);
			const cy = Math.cos(k.yaw);
			let mx = -sy * maju + cy * samping;
			let mz = -cy * maju - sy * samping;
			besar = Math.hypot(mx, mz);
			if (besar > 0.05) {
				rute.current = null;
			} else if (rute.current) {
				const r = rute.current;
				const tuju = r.titik[0];
				const dx = tuju.x - p.x;
				const dz = tuju.z - p.z;
				const d = Math.hypot(dx, dz);
				if (d < 0.3) {
					r.titik.shift();
					if (!r.titik.length) {
						if (r.buka) setKeadaan({ minta: `${r.buka}:${performance.now()}` });
						rute.current = null;
					}
				} else {
					mx = dx / d;
					mz = dz / d;
					besar = 1;
				}
			}
			if (besar > 1) {
				mx /= besar;
				mz /= besar;
				besar = 1;
			}

			// gerak per sumbu (bisa menggeser di sepanjang dinding); tinggi ikut tangga;
			// mobil & motor juga menghalangi.
			if (besar > 0.05) {
				const v = (lari ? KECEPATAN.lari : KECEPATAN.jalan) * besar * dt;
				const ax = p.x;
				const az = p.z;
				const bisa = (x, z) => {
					const y = langkah(p.y, x, z);
					if (y === null) return null;
					if (y < 0.5 && tabrakKendaraan(x, z, 0.38)) return null;
					return y;
				};
				let y = bisa(p.x + mx * v, p.z);
				if (y !== null) {
					p.x += mx * v;
					p.y = y;
				}
				y = bisa(p.x, p.z + mz * v);
				if (y !== null) {
					p.z += mz * v;
					p.y = y;
				}
				g.rotation.y += (sudutDekat(g.rotation.y, Math.atan2(mx, mz)) - g.rotation.y) * (1 - Math.exp(-14 * dt));
				if (rute.current && Math.hypot(p.x - ax, p.z - az) < v * 0.1) {
					macet.current += dt;
					if (macet.current > 0.5) rute.current = null;
				} else macet.current = 0;
			}

			// loncat
			const l = loncat.current;
			if (kendali.loncat && l.h === 0) l.vy = LONCAT;
			kendali.loncat = false;
			if (l.vy !== 0 || l.h > 0) {
				l.h += l.vy * dt;
				l.vy -= GRAVITASI * dt;
				if (l.h <= 0) {
					l.h = 0;
					l.vy = 0;
				}
			}
			gerak.current.udara = l.h > 0.05;
		} else if (jenisMode === "duduk") {
			kendali.loncat = false;
			const c = mode.current.kursi;
			p.set(c.x + Math.sin(c.rot) * 0.05, c.lantai * H, c.z + Math.cos(c.rot) * 0.05);
			g.rotation.y = c.rot;
			// bergerak = berdiri
			if (Math.hypot(maju, samping) > 0.3) berdiri();
		} else if (jenisMode === "masuk") {
			kendali.loncat = false;
			const md = mode.current;
			const kend = md.k;
			md.t += dt;
			if (kend.jenis === "mobil") {
				// 1) melangkah ke pintu sambil pintu dibuka, 2) masuk ke jok, 3) pintu ditutup
				const pintu = titikNaik(kend);
				const jok = keDunia(kend, -0.4, 0.1);
				if (md.t < 0.5) {
					const f = md.t / 0.5;
					p.x += (pintu.x - p.x) * Math.min(1, f * 1.5);
					p.z += (pintu.z - p.z) * Math.min(1, f * 1.5);
					kend.pintu = f;
					g.rotation.y = kend.rot + Math.PI / 2;
					besar = 0.6;
				} else if (md.t < 0.9) {
					const f = (md.t - 0.5) / 0.4;
					p.x = pintu.x + (jok.x - pintu.x) * f;
					p.z = pintu.z + (jok.z - pintu.z) * f;
					kend.pintu = 1;
				} else if (md.t < 1.35) {
					kend.pintu = 1 - (md.t - 0.9) / 0.45;
				} else {
					kend.pintu = 0;
					mode.current = { ...md, jenis: "kemudi", t: 0 };
				}
			} else {
				const jok = keDunia(kend, 0, -0.1);
				const f = Math.min(1, md.t / 0.45);
				p.x += (jok.x - p.x) * f;
				p.z += (jok.z - p.z) * f;
				g.rotation.y = kend.rot;
				kend.miring *= 1 - f;
				if (md.t >= 0.45) {
					kend.miring = 0;
					mode.current = { ...md, jenis: "kemudi", t: 0 };
				}
			}
		} else if (jenisMode === "kemudi") {
			const kend = mode.current.k;
			const c = KEMUDI[kend.jenis];
			kendali.loncat = false;
			// gas / rem / mundur
			const target = maju > 0.05 ? maju * (lari ? c.turbo : c.maju) : maju < -0.05 ? maju * c.mundur : 0;
			const beda = target - kend.laju;
			const searah = Math.sign(beda) === Math.sign(kend.laju) || kend.laju === 0;
			const batas = (searah ? c.gas : c.rem) * dt;
			kend.laju += Math.max(-batas, Math.min(batas, beda));
			if (Math.abs(maju) < 0.05) kend.laju *= Math.exp(-1.2 * dt);
			if (Math.abs(kend.laju) < 0.02 && Math.abs(maju) < 0.05) kend.laju = 0;
			kend.setir += (Math.max(-1, Math.min(1, samping)) - kend.setir) * (1 - Math.exp(-8 * dt));
			// model sepeda: belok kanan (D) = rot berkurang
			const putar = (-kend.setir * c.belok * kend.laju * dt) / c.sumbu * 2;
			const lama = { x: kend.x, z: kend.z, rot: kend.rot };
			kend.rot += putar;
			kend.x += Math.sin(kend.rot) * kend.laju * dt;
			kend.z += Math.cos(kend.rot) * kend.laju * dt;
			const tabrakan = lingkaran(kend).some((o) => tabrakKendaraanStatis(o.x, o.z, o.r) || tabrakKendaraan(o.x, o.z, o.r, kend));
			if (tabrakan) {
				Object.assign(kend, lama);
				kend.laju *= -0.25;
			}
			kend.roda += (kend.laju * dt) / 0.32;
			if (kend.jenis === "motor") kend.miring = -kend.setir * Math.min(1, Math.abs(kend.laju) / 8) * 0.35;
			// pengemudi mengikuti kendaraan
			const jok = kend.jenis === "mobil" ? keDunia(kend, -0.4, 0.1) : keDunia(kend, 0, -0.12);
			p.set(jok.x, TANAH, jok.z);
			g.rotation.y = kend.rot;
			// kamera berangsur ke belakang kendaraan saat melaju
			if (Math.abs(kend.laju) > 0.5) {
				const ke = kend.rot + Math.PI;
				k.yaw += (sudutDekat(k.yaw, ke) - k.yaw) * (1 - Math.exp(-2.2 * dt));
			}
		} else if (jenisMode === "turun") {
			const md = mode.current;
			const kend = md.k;
			md.t += dt;
			kend.laju = 0;
			kend.setir *= 0.8;
			if (kend.jenis === "mobil") {
				kend.pintu = Math.min(1, md.t / 0.4);
				if (md.t >= 0.4 && !md.keluar) {
					// berdiri di samping pintu (atau di belakang mobil bila sisi pintu terhalang)
					const pilihan = [titikNaik(kend), keDunia(kend, 1.3, 0.35), keDunia(kend, 0, -2.8)];
					const ke = pilihan.find((q) => langkah(TANAH, q.x, q.z) !== null && !tabrakKendaraan(q.x, q.z, 0.38)) || pilihan[0];
					p.set(ke.x, TANAH, ke.z);
					g.rotation.y = kend.rot - Math.PI / 2;
					md.keluar = true;
				}
				if (md.t >= 0.4) kend.pintu = Math.max(0, 1 - (md.t - 0.4) / 0.45);
				if (md.t >= 0.85) {
					kend.pintu = 0;
					mode.current = { jenis: "jalan", t: 0, k: null, kursi: null, dari: null };
				}
			} else {
				const pilihan = [titikNaik(kend), keDunia(kend, 0.7, 0), keDunia(kend, 0, -1.3)];
				const ke = pilihan.find((q) => langkah(TANAH, q.x, q.z) !== null && !tabrakKendaraan(q.x, q.z, 0.38)) || pilihan[0];
				p.set(ke.x, TANAH, ke.z);
				kend.miring = 0.12;
				mode.current = { jenis: "jalan", t: 0, k: null, kursi: null, dari: null };
			}
		}

		// --- tampilan tokoh pengunjung sesuai mode ---
		const mk = mode.current;
		const diMobil = (mk.jenis === "kemudi" || (mk.jenis === "masuk" && mk.t > 0.85) || (mk.jenis === "turun" && !mk.keluar)) && mk.k?.jenis === "mobil";
		const diMotor = (mk.jenis === "kemudi" || (mk.jenis === "masuk" && mk.t >= 0.3)) && mk.k?.jenis === "motor";
		const duduk = mk.jenis === "duduk" || diMotor;
		tokohJalan.current.visible = !diMobil && !duduk;
		tokohDuduk.current.visible = duduk && !diMobil;
		// di motor: jok lebih tinggi daripada kursi kantor
		tokohDuduk.current.position.y = diMotor ? 0.38 : 0;
		badanLoncat.current.position.y = loncat.current.h;

		const gr = gerak.current;
		const targetLaju = besar > 0.05 ? (lari ? 1 : 0.7) : 0;
		gr.laju += (targetLaju - gr.laju) * (1 - Math.exp(-10 * dt));
		if (besar > 0.05) gr.fase += dt * (lari ? 13 : 9);

		// --- kabar untuk UI ---
		const diTangga = !!tanggaDi(p.x, p.z);
		const lantai = p.y > H / 2 ? 1 : 0;
		posisi.x = p.x;
		posisi.y = p.y;
		posisi.z = p.z;
		posisi.rot = g.rotation.y;
		posisi.lantai = lantai;
		// untuk tamu lain (jelajah bersama)
		posisi.yTampil = p.y + loncat.current.h;
		posisi.pose = diMobil ? "mobil" : diMotor ? "motor" : duduk ? "duduk" : "jalan";
		posisi.udara = gr.udara;
		posisi.lari = lari && besar > 0.05;
		posisi.kend = mk.k || null;
		const em = diriSendiri.emote;
		gr.isyarat = em && performance.now() < em.sampai ? em.jenis : null;

		const tujuanAkhir = rute.current?.titik[rute.current.titik.length - 1];
		penandaTujuan.current.visible = !!tujuanAkhir;
		if (tujuanAkhir) penandaTujuan.current.position.set(tujuanAkhir.x, (lantai ? lantai * H : tinggiTanah(tujuanAkhir.x, tujuanAkhir.z)) + 0.03, tujuanAkhir.z);

		const area = diTangga ? "tangga" : cariArea(p.x, p.z, lantai)?.id ?? (lantai ? "aula2" : "belakang1");
		let dekat = null;
		if (mk.jenis === "duduk") dekat = "berdiri";
		else if (mk.jenis === "kemudi") dekat = "keluar";
		else if (mk.jenis === "jalan" && !diTangga) {
			// yang berjangkauan pendek (kursi, kendaraan, benda) didahulukan bila dalam jangkauan
			let terdekat = Infinity;
			const coba = (id, d, batas) => {
				if (d < batas && d < terdekat) {
					terdekat = d;
					dekat = id;
				}
			};
			for (const b of BENDA) if (b.lantai === lantai) coba(b.id, Math.hypot(b.x - p.x, b.z - p.z), JARAK_BENDA);
			for (const c of kursiBebas) if (c.lantai === lantai) coba(c.id, Math.hypot(c.x - p.x, c.z - p.z), JARAK_KURSI);
			if (lantai === 0) {
				for (const kend of KENDARAAN) {
					if (kendaraanDipakaiLain(kend.id)) continue;
					const t = titikNaik(kend);
					coba(kend.id, Math.hypot(t.x - p.x, t.z - p.z), kend.jenis === "mobil" ? JARAK_MOBIL : JARAK_MOTOR);
				}
			}
			for (const [id, tamu] of pemainLain) {
				const st = tamu.s;
				if (!st || st.pose === "mobil" || (st.y > H / 2 ? 1 : 0) !== lantai) continue;
				coba("tamu:" + id, Math.hypot(st.x - p.x, st.z - p.z), JARAK_TAMU);
			}
			if (!dekat) {
				for (const a of PETUGAS) {
					if (a.lantai !== lantai || a.id !== area) continue;
					coba(a.id, Math.hypot(a.npc.x - p.x, a.npc.z - p.z), JARAK_SAPA);
				}
			}
		}
		const modeUi = mk.jenis === "kemudi" ? mk.k.jenis : mk.jenis === "duduk" ? "duduk" : "jalan";
		setKeadaan({ area, lantai, dekat, mode: modeUi });

		// Bidang klik mengikuti lantai tempat pemain berada.
		bidangKlik.current.position.y = (lantai ? lantai * H : tinggiTanah(p.x, p.z)) + 0.02;

		// --- kamera orang ketiga ---
		// Di halaman kamera lebih landai dan memandang lebih tinggi supaya tampak depan
		// gedung (atap, menara) terlihat utuh; di dalam gedung kamera kembali menunduk.
		k.luar += ((area === "luar" ? 1 : 0) - k.luar) * (1 - Math.exp(-3 * dt));
		const jarakKamera = k.jarak + (mk.jenis === "kemudi" && mk.k.jenis === "mobil" ? 2.5 : 0);
		const pitch = Math.max(0.12, k.pitch - 0.27 * k.luar);
		const sy = Math.sin(k.yaw);
		const cy = Math.cos(k.yaw);
		// Saat pemain di luar gedung, kamera tidak boleh masuk ke badan gedung (misalnya
		// ketika mobil menghadap menjauhi gedung): tarik mendekat sampai di luar gedung
		// atau sudah di atas atap.
		let jarakAman = jarakKamera;
		if (area === "luar") {
			for (let d = jarakKamera; d >= 3; d -= 0.5) {
				jarakAman = d;
				const kx = p.x + sy * d * Math.cos(pitch);
				const kz = p.z + cy * d * Math.cos(pitch);
				const ky = p.y + 1.2 + d * Math.sin(pitch);
				if (!(kx > -15.8 && kx < 15.8 && kz > -13.8 && kz < 12.9 && ky < 11)) break;
			}
		}
		k.jarakAman = k.jarakAman == null ? jarakAman : k.jarakAman + (jarakAman - k.jarakAman) * (1 - Math.exp(-8 * dt));
		const datar = k.jarakAman * Math.cos(pitch);
		const tinggi = k.jarakAman * Math.sin(pitch);
		bantu.kepala.set(p.x, p.y + 1.2, p.z);
		bantu.fokus.set(p.x, p.y + 1.2 + 1.8 * k.luar, p.z);
		const tx = p.x + sy * datar;
		const ty = p.y + 1.2 + tinggi;
		const tz = p.z + cy * datar;
		if (k.lompat) {
			camera.position.set(tx, ty, tz);
			bantu.lihat.copy(bantu.fokus);
			k.lompat = false;
		} else {
			const f = 1 - Math.exp(-7 * dt);
			camera.position.x += (tx - camera.position.x) * f;
			camera.position.y += (ty - camera.position.y) * f;
			camera.position.z += (tz - camera.position.z) * f;
			bantu.lihat.lerp(bantu.fokus, 1 - Math.exp(-10 * dt));
		}
		camera.lookAt(bantu.lihat);

		// --- dinding lantai aktif yang menghalangi pandangan dibuat tembus pandang ---
		bantu.arah.subVectors(bantu.kepala, camera.position);
		const jauh = bantu.arah.length();
		bantu.ray.set(camera.position, bantu.arah.normalize());
		bantu.ray.far = jauh;
		const f = 1 - Math.exp(-10 * dt);
		for (const l of [0, 1]) {
			const dinding = daftarDinding.current[l].filter(Boolean);
			const kena =
				l === lantai ? new Set(bantu.ray.intersectObjects(dinding, false).flatMap((h) => h.object.userData.sekelompok || [h.object])) : null;
			for (const md of dinding) {
				const target = kena?.has(md) ? 0.15 : 1;
				for (const bahan of md.userData.bahan) {
					if (Math.abs(bahan.opacity - target) < 0.001) continue;
					bahan.opacity += (target - bahan.opacity) * f;
					bahan.depthWrite = bahan.opacity > 0.95;
				}
			}
		}
	});

	// Ketuk/klik lantai untuk berjalan ke titik itu. Bidang tak terlihat ini hanya
	// menangkap klik; seretan kamera (delta besar) diabaikan.
	const ketukLantai = (e) => {
		if (e.delta > 8 || mode.current.jenis !== "jalan") return;
		kendali.target = { x: e.point.x, z: e.point.z, lantai: posisi.lantai };
	};

	return (
		<>
			<group ref={grup} position={[TITIK_MULAI.x, tinggiTanah(TITIK_MULAI.x, TITIK_MULAI.z), TITIK_MULAI.z]} rotation-y={TITIK_MULAI.rot}>
				<group ref={badanLoncat}>
					<group ref={tokohJalan}>
						<Tokoh penampilan={penampilan} pose="jalan" gerak={gerak} />
					</group>
					<group ref={tokohDuduk} visible={false}>
						<Tokoh penampilan={penampilan} pose="duduk" />
					</group>
				</group>
			</group>
			<mesh ref={penandaTujuan} rotation-x={-Math.PI / 2} visible={false}>
				<ringGeometry args={[0.25, 0.38, 24]} />
				<meshBasicMaterial color="#ffffff" transparent opacity={0.85} depthWrite={false} />
			</mesh>
			<mesh ref={bidangKlik} rotation-x={-Math.PI / 2} position-y={0.02} onClick={ketukLantai}>
				<planeGeometry args={[120, 120]} />
				<meshBasicMaterial colorWrite={false} depthWrite={false} />
			</mesh>
		</>
	);
}
