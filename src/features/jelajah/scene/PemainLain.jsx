import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, SRGBColorSpace } from "three";
import { TINGGI_LANTAI } from "../kantorConfig";
import { posisi } from "../jelajahStore";
import { penampilanAvatar } from "../avatar";
import { kenakanGaya } from "../lemari";
import { diriSendiri, pemainLain, useMultipemain } from "../multipemain";
import { kendaraanDariId } from "./kendaraan";
import { dalamLahanCcm } from "./gedungKhusus";
import { aturBadanRenang } from "./layout";
import PancinganTamu from "./PancinganTamu";
import { pemainWilayah } from "../wilayah/uiWilayah";
import { KeranjangTamu } from "./KeranjangTangan";
import Tokoh from "./Tokoh";

// Tamu lain yang sedang menjelajah bersama: tokoh sesuai avatar pilihannya, label
// nama, balon chat, dan emote. Posisi dari server (±10x/detik) dihaluskan tiap
// frame supaya gerakannya tidak patah-patah.

const H = TINGGI_LANTAI;
const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, sans-serif';
const EMOJI = { lambai: "👋", jempol: "👍", tepuk: "👏", tawa: "😂", hati: "❤️" };
const sudutDekat = (dari, ke) => dari + Math.atan2(Math.sin(ke - dari), Math.cos(ke - dari));
// Tinggi label nama di atas kepala per pose.
const TINGGI_LABEL = { mobil: 1.85, motor: 2.0, duduk: 1.65, perahu: 1.35, jongkok: 1.6 };
// Posisi tamu lain diputar TUNDA ms di belakang waktu nyata dan diinterpolasi di antara
// dua kiriman server (±10x/detik), jadi tetap mulus walau paket datang tak teratur.
// Bila kiriman terlambat, gerak diteruskan sebentar (maks. EKSTRA ms) lalu berhenti.
const TUNDA = 120;
const EKSTRA = 150;

function sasaranJejak(j, s, kini) {
	if (!j?.length) return s;
	const rt = kini - TUNDA;
	if (rt <= j[0].t) return j[0];
	for (let i = j.length - 2; i >= 0; i--) {
		const a = j[i];
		const b = j[i + 1];
		if (rt >= a.t && rt <= b.t) {
			const f = (rt - a.t) / Math.max(1, b.t - a.t);
			return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f, rot: a.rot + (sudutDekat(a.rot, b.rot) - a.rot) * f };
		}
	}
	const b = j[j.length - 1];
	const a = j[j.length - 2];
	const lewat = rt - b.t;
	if (!a || lewat > EKSTRA) return b;
	const f = lewat / Math.max(1, b.t - a.t);
	return { x: b.x + (b.x - a.x) * f, y: b.y, z: b.z + (b.z - a.z) * f, rot: b.rot };
}
// Lantai pemain lain tampak bila lantai itu juga sedang ditampilkan (sama dengan GrupLantai).
// Tamu di lantai atas kantor hanya tampak dari lantai atas & sebaliknya; di dalam mal (atrium
// terbuka) tamu di lantai mana pun tetap tampak.
const lantaiTampak = (y, x, z) => (dalamLahanCcm(x, z) ? true : y > H / 2 ? posisi.y > 0.9 : posisi.y < 2.6);

function useKanvas(lebar, tinggi) {
	const k = useMemo(() => {
		const c = document.createElement("canvas");
		c.width = lebar;
		c.height = tinggi;
		const t = new CanvasTexture(c);
		t.colorSpace = SRGBColorSpace;
		return { c, t, g: c.getContext("2d"), isi: null };
	}, [lebar, tinggi]);
	useEffect(() => () => k.t.dispose(), [k]);
	return k;
}

function gambarLabel(k, nama, jk) {
	const { g, c } = k;
	g.clearRect(0, 0, c.width, c.height);
	g.font = `700 34px ${FONT}`;
	const teks = nama.length > 22 ? nama.slice(0, 21) + "…" : nama;
	const w = Math.min(c.width - 8, g.measureText(teks).width + 64);
	const x0 = (c.width - w) / 2;
	g.fillStyle = "rgba(15,23,42,.78)";
	g.beginPath();
	g.roundRect(x0, 8, w, 56, 28);
	g.fill();
	g.fillStyle = jk === "P" ? "#f472b6" : "#38bdf8";
	g.beginPath();
	g.arc(x0 + 28, 36, 9, 0, Math.PI * 2);
	g.fill();
	g.fillStyle = "#fff";
	g.textAlign = "center";
	g.textBaseline = "middle";
	g.fillText(teks, c.width / 2 + 12, 37);
	k.t.needsUpdate = true;
}

function gambarBalon(k, teks) {
	const { g, c } = k;
	g.clearRect(0, 0, c.width, c.height);
	g.font = `500 30px ${FONT}`;
	const baris = [""];
	for (const kata of teks.split(" ")) {
		const coba = (baris[baris.length - 1] + " " + kata).trim();
		if (g.measureText(coba).width > 440 && baris[baris.length - 1]) baris.push(kata);
		else baris[baris.length - 1] = coba;
	}
	const tampil = baris.slice(0, 4);
	const lebar = Math.min(480, Math.max(...tampil.map((b) => g.measureText(b).width)) + 40);
	const tinggi = tampil.length * 36 + 26;
	const x0 = (c.width - lebar) / 2;
	const y0 = c.height - 20 - tinggi;
	g.fillStyle = "rgba(255,255,255,.97)";
	g.strokeStyle = "rgba(15,23,42,.2)";
	g.lineWidth = 3;
	g.beginPath();
	g.roundRect(x0, y0, lebar, tinggi, 20);
	g.fill();
	g.stroke();
	g.beginPath();
	g.moveTo(c.width / 2 - 14, y0 + tinggi);
	g.lineTo(c.width / 2, y0 + tinggi + 16);
	g.lineTo(c.width / 2 + 14, y0 + tinggi);
	g.fill();
	g.fillStyle = "#0f172a";
	g.textAlign = "center";
	g.textBaseline = "middle";
	tampil.forEach((b, i) => g.fillText(b, c.width / 2, y0 + 13 + 18 + i * 36));
	k.t.needsUpdate = true;
}

function gambarEmoji(k, jenis) {
	const { g, c } = k;
	g.clearRect(0, 0, c.width, c.height);
	g.font = `96px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
	g.textAlign = "center";
	g.textBaseline = "middle";
	g.fillText(EMOJI[jenis] || "👋", c.width / 2, c.height / 2 + 6);
	k.t.needsUpdate = true;
}

// Balon chat + emote di atas kepala; `sumber` = { ucap, emote } (mutable).
function Hiasan({ sumber, tinggiRef, lihat, posisiRef }) {
	const balon = useKanvas(512, 192);
	const emoji = useKanvas(128, 128);
	const spBalon = useRef();
	const spEmoji = useRef();
	useFrame(({ clock }) => {
		const kini = performance.now();
		const tampak = lihat.current;
		const u = sumber().ucap;
		const adaUcap = tampak && u && kini < u.sampai;
		if (adaUcap && balon.isi !== u) {
			balon.isi = u;
			gambarBalon(balon, u.teks);
		}
		spBalon.current.visible = !!adaUcap;
		const e = sumber().emote;
		const adaEmote = tampak && e && kini < e.sampai;
		if (adaEmote && emoji.isi !== e) {
			emoji.isi = e;
			gambarEmoji(emoji, e.jenis);
		}
		spEmoji.current.visible = !!adaEmote;
		const p = posisiRef.current;
		const atas = p.y + tinggiRef.current;
		spBalon.current.position.set(p.x, atas + 0.95, p.z);
		if (adaEmote) {
			const umur = 1 - (e.sampai - kini) / 2600;
			spEmoji.current.position.set(p.x, atas + 0.35 + umur * 0.5 + Math.sin(clock.elapsedTime * 6) * 0.04, p.z);
			spEmoji.current.material.opacity = Math.min(1, (e.sampai - kini) / 500);
		}
	});
	return (
		<>
			<sprite ref={spBalon} scale={[2.4, 0.9, 1]} visible={false} renderOrder={12}>
				<spriteMaterial map={balon.t} transparent depthTest={false} />
			</sprite>
			<sprite ref={spEmoji} scale={[0.6, 0.6, 1]} visible={false} renderOrder={13}>
				<spriteMaterial map={emoji.t} transparent depthTest={false} />
			</sprite>
		</>
	);
}

function Tamu({ id, nama, jk, avatar, kulit, gaya, diWilayah }) {
	const kunciGaya = JSON.stringify(gaya || null);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const penampilan = useMemo(() => kenakanGaya(penampilanAvatar({ jk, avatar, kulit }), gaya), [jk, avatar, kulit, kunciGaya]);
	const grup = useRef();
	const jalan = useRef();
	const duduk = useRef();
	const label = useKanvas(512, 72);
	const spLabel = useRef();
	const gerak = useRef({ laju: 0, fase: 0, udara: false, isyarat: null });
	const gerakDuduk = useRef({ aktivitas: null });
	const mangkuk = useRef();
	const tampil = useRef({ x: 0, y: 0, z: 0, rot: 0, ada: false, laju: 0 });
	const tinggi = useRef(2.1);
	const lihat = useRef(false);

	useEffect(() => gambarLabel(label, nama, jk), [label, nama, jk]);

	useFrame((_, dtMentah) => {
		const dt = Math.min(dtMentah, 0.1);
		const p = pemainLain.get(id);
		const s = p?.s;
		const g = grup.current;
		if (!s) {
			g.visible = false;
			spLabel.current.visible = false;
			lihat.current = false;
			return;
		}
		const t = tampil.current;
		const q = sasaranJejak(p.jejak, s, performance.now());
		const jauh = Math.hypot(q.x - t.x, q.z - t.z);
		if (!t.ada || jauh > 5 || Math.abs(q.y - t.y) > 2) {
			Object.assign(t, { x: q.x, y: q.y, z: q.z, rot: q.rot, ada: true });
		} else {
			// sasaran sudah mulus; pelembut kecil hanya meredam koreksi ekstrapolasi
			const f = 1 - Math.exp(-25 * dt);
			t.x += (q.x - t.x) * f;
			t.y += (q.y - t.y) * f;
			t.z += (q.z - t.z) * f;
			t.rot += (sudutDekat(t.rot, q.rot) - t.rot) * f;
		}
		// laju nyata (m/detik) dari perpindahan tampilan, untuk animasi kaki
		t.laju += (Math.hypot(t.x - g.position.x, t.z - g.position.z) / Math.max(dt, 1e-3) - t.laju) * (1 - Math.exp(-10 * dt));
		g.position.set(t.x, t.y, t.z);
		g.rotation.y = t.rot;

		// Animasi kaki dari laju sebenarnya.
		// Berlari bila tamu itu menekan lari (langkah lebar & cepat), selain itu berjalan.
		const bergerak = t.laju > 0.4;
		const gr = gerak.current;
		gr.laju += ((bergerak ? (s.lari ? 1 : 0.7) : 0) - gr.laju) * (1 - Math.exp(-8 * dt));
		if (bergerak) gr.fase += dt * (s.lari ? 13 : s.pose === "jongkok" ? 6.5 : 9);
		gr.jongkok = (gr.jongkok ?? 0) + ((s.pose === "jongkok" ? 1 : 0) - (gr.jongkok ?? 0)) * (1 - Math.exp(-10 * dt));
		// kiriman ±10x/detik: u dihaluskan supaya tangan & kaki tidak patah-patah
		gr.panjatU = s.pose !== "panjat" ? -1 : gr.panjatU >= 0 ? gr.panjatU + ((s.pu ?? 0) - gr.panjatU) * (1 - Math.exp(-20 * dt)) : s.pu ?? 0;
		gr.panjatT = s.pt ?? 0;
		gr.udara = !!s.udara;
		gerakDuduk.current.aktivitas = s.ak === "makan" ? "makan" : null;
		mangkuk.current.visible = s.ak === "makan";
		const kini = performance.now();
		// sedang memancing: tangan menggenggam joran, atau mengangkat ikan hasil tangkapan
		gr.isyarat = s.pc && s.pose === "mancing" ? (s.pc.f === 5 ? "angkat" : "mancing") : s.pose === "renang" ? "renang" : p.emote && kini < p.emote.sampai ? p.emote.jenis : s.kr ? "keranjang" : null;
		// berenang: badan mendatar saat bergerak, tegak mengapung saat diam
		gr.renang = s.pose === "renang" ? (gr.renang ?? 0) + ((bergerak ? 1 : 0) - (gr.renang ?? 0)) * (1 - Math.exp(-4 * dt)) : 0;
		if (s.pose === "renang") aturBadanRenang(jalan.current, gr.renang);
		else if (jalan.current.rotation.x) {
			jalan.current.rotation.x = 0;
			jalan.current.position.y = 0;
		}

		// Kendaraan yang ia kemudikan ikut bergerak (kecuali sedang kita kemudikan sendiri).
		// Kendaraan digerakkan oleh pengemudinya saja; penumpang hanya ikut duduk.
		const k = s.kend && (s.kend.kursi ?? 0) === 0 && kendaraanDariId(s.kend.id, s.kend);
		if (k && !(posisi.kend === k && (posisi.kursi ?? 0) === 0)) {
			const f = 1 - Math.exp(-12 * dt);
			const lompat = Math.hypot(s.kend.x - k.x, s.kend.z - k.z) > 6;
			k.x = lompat ? s.kend.x : k.x + (s.kend.x - k.x) * f;
			k.z = lompat ? s.kend.z : k.z + (s.kend.z - k.z) * f;
			k.rot = lompat ? s.kend.rot : k.rot + (sudutDekat(k.rot, s.kend.rot) - k.rot) * f;
			k.laju = s.kend.laju;
			k.setir = s.kend.setir;
			k.pintu = s.kend.pintu;
			k.miring = s.kend.miring;
			k.h = s.kend.h || 0;
			k.roda += (k.laju * dt) / 0.32;
		}

		const tampak = diWilayah || lantaiTampak(t.y, t.x, t.z);
		lihat.current = tampak;
		g.visible = tampak && s.pose !== "mobil";
		jalan.current.visible = s.pose === "jalan" || s.pose === "mancing" || s.pose === "renang" || s.pose === "jongkok" || s.pose === "panjat";
		duduk.current.visible = s.pose === "duduk" || s.pose === "motor" || s.pose === "perahu";
		duduk.current.position.y = s.pose === "motor" ? 0.38 : 0;
		tinggi.current = TINGGI_LABEL[s.pose] ?? 2.05;
		spLabel.current.visible = tampak;
		spLabel.current.position.set(t.x, t.y + tinggi.current + 0.12, t.z);
	});

	return (
		<>
			<group ref={grup} visible={false}>
				<group ref={jalan}>
					<Tokoh penampilan={penampilan} pose="jalan" gerak={gerak} />
					<KeranjangTamu sumber={() => pemainLain.get(id)?.s} />
				</group>
				<group ref={duduk} visible={false}>
					<Tokoh penampilan={penampilan} pose="duduk" gerak={gerakDuduk} />
					{/* mangkuk mie ayam di meja depannya saat ia makan */}
					<group ref={mangkuk} position={[0, 0.75, 0.37]} visible={false}>
						<mesh position-y={0.05}>
							<cylinderGeometry args={[0.11, 0.06, 0.1, 14]} />
							<meshStandardMaterial color="#f8fafc" />
						</mesh>
						<mesh position-y={0.085}>
							<cylinderGeometry args={[0.098, 0.098, 0.02, 14]} />
							<meshStandardMaterial color="#e8b04a" />
						</mesh>
						<mesh position={[0.12, 0.11, 0]} rotation-z={0.5}>
							<boxGeometry args={[0.012, 0.24, 0.012]} />
							<meshStandardMaterial color="#d6a96b" />
						</mesh>
					</group>
				</group>
			</group>
			<sprite ref={spLabel} scale={[1.9, 0.27, 1]} visible={false} renderOrder={11}>
				<spriteMaterial map={label.t} transparent depthTest={false} />
			</sprite>
			<Hiasan sumber={() => pemainLain.get(id) || {}} tinggiRef={tinggi} lihat={lihat} posisiRef={tampil} />
			<PancinganTamu sumber={() => pemainLain.get(id)?.s} tampil={tampil} />
		</>
	);
}

// Balon chat & emote milik pemain sendiri.
function HiasanSendiri({ diWilayah }) {
	const pos = useRef({ x: 0, y: 0, z: 0 });
	const tinggi = useRef(2.05);
	const lihat = useRef(true);
	useFrame(() => {
		const q = diWilayah ? pemainWilayah : posisi;
		pos.current.x = q.x;
		pos.current.y = q.yTampil ?? q.y ?? 0;
		pos.current.z = q.z;
		tinggi.current = TINGGI_LABEL[posisi.pose] ?? 2.05;
	});
	return <Hiasan sumber={() => diriSendiri} tinggiRef={tinggi} lihat={lihat} posisiRef={pos} />;
}

// diWilayah: di dunia kecamatan (posisi sendiri dari pemainWilayah, tanpa lantai kantor).
export default function PemainLain({ diWilayah = false }) {
	const { daftar, status } = useMultipemain();
	return (
		<>
			{daftar.map((p) => (
				<Tamu key={p.id} id={p.id} nama={p.nama} jk={p.jk} avatar={p.avatar} kulit={p.kulit} gaya={p.gaya} diWilayah={diWilayah} />
			))}
			{status === "tersambung" && <HiasanSendiri diWilayah={diWilayah} />}
		</>
	);
}
