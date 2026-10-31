import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, SRGBColorSpace } from "three";
import { TINGGI_LANTAI } from "../kantorConfig";
import { posisi } from "../jelajahStore";
import { penampilanAvatar } from "../avatar";
import { diriSendiri, pemainLain, useMultipemain } from "../multipemain";
import { kendaraanDariId } from "./kendaraan";
import Tokoh from "./Tokoh";

// Tamu lain yang sedang menjelajah bersama: tokoh sesuai avatar pilihannya, label
// nama, balon chat, dan emote. Posisi dari server (±10x/detik) dihaluskan tiap
// frame supaya gerakannya tidak patah-patah.

const H = TINGGI_LANTAI;
const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, sans-serif';
const EMOJI = { lambai: "👋", jempol: "👍", tepuk: "👏", tawa: "😂", hati: "❤️" };
const sudutDekat = (dari, ke) => dari + Math.atan2(Math.sin(ke - dari), Math.cos(ke - dari));
// Lantai pemain lain tampak bila lantai itu juga sedang ditampilkan (sama dengan GrupLantai).
const lantaiTampak = (y) => (y > H / 2 ? posisi.y > 0.9 : posisi.y < 2.6);

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

function Tamu({ id, nama, jk, avatar, kulit }) {
	const penampilan = useMemo(() => penampilanAvatar({ jk, avatar, kulit }), [jk, avatar, kulit]);
	const grup = useRef();
	const jalan = useRef();
	const duduk = useRef();
	const label = useKanvas(512, 72);
	const spLabel = useRef();
	const gerak = useRef({ laju: 0, fase: 0, udara: false, isyarat: null });
	const tampil = useRef({ x: 0, y: 0, z: 0, rot: 0, ada: false });
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
		const jauh = Math.hypot(s.x - t.x, s.z - t.z);
		if (!t.ada || jauh > 5 || Math.abs(s.y - t.y) > 2) {
			Object.assign(t, { x: s.x, y: s.y, z: s.z, rot: s.rot, ada: true });
		} else {
			const f = 1 - Math.exp(-12 * dt);
			t.x += (s.x - t.x) * f;
			t.y += (s.y - t.y) * f;
			t.z += (s.z - t.z) * f;
			t.rot += (sudutDekat(t.rot, s.rot) - t.rot) * f;
		}
		g.position.set(t.x, t.y, t.z);
		g.rotation.y = t.rot;

		// Animasi kaki dari laju sebenarnya.
		// Berlari bila tamu itu menekan lari (langkah lebar & cepat), selain itu berjalan.
		const bergerak = jauh > 0.04;
		const gr = gerak.current;
		gr.laju += ((bergerak ? (s.lari ? 1 : 0.7) : 0) - gr.laju) * (1 - Math.exp(-8 * dt));
		if (bergerak) gr.fase += dt * (s.lari ? 13 : 9);
		gr.udara = !!s.udara;
		const kini = performance.now();
		gr.isyarat = p.emote && kini < p.emote.sampai ? p.emote.jenis : null;

		// Kendaraan yang ia kemudikan ikut bergerak (kecuali sedang kita kemudikan sendiri).
		const k = s.kend && kendaraanDariId(s.kend.id);
		if (k && posisi.kend !== k) {
			const f = 1 - Math.exp(-12 * dt);
			const lompat = Math.hypot(s.kend.x - k.x, s.kend.z - k.z) > 6;
			k.x = lompat ? s.kend.x : k.x + (s.kend.x - k.x) * f;
			k.z = lompat ? s.kend.z : k.z + (s.kend.z - k.z) * f;
			k.rot = lompat ? s.kend.rot : k.rot + (sudutDekat(k.rot, s.kend.rot) - k.rot) * f;
			k.laju = s.kend.laju;
			k.setir = s.kend.setir;
			k.pintu = s.kend.pintu;
			k.miring = s.kend.miring;
			k.roda += (k.laju * dt) / 0.32;
		}

		const tampak = lantaiTampak(t.y);
		lihat.current = tampak;
		g.visible = tampak && s.pose !== "mobil";
		jalan.current.visible = s.pose === "jalan";
		duduk.current.visible = s.pose === "duduk" || s.pose === "motor";
		duduk.current.position.y = s.pose === "motor" ? 0.38 : 0;
		tinggi.current = s.pose === "mobil" ? 1.85 : s.pose === "motor" ? 2.0 : s.pose === "duduk" ? 1.65 : 2.05;
		spLabel.current.visible = tampak;
		spLabel.current.position.set(t.x, t.y + tinggi.current + 0.12, t.z);
	});

	return (
		<>
			<group ref={grup} visible={false}>
				<group ref={jalan}>
					<Tokoh penampilan={penampilan} pose="jalan" gerak={gerak} />
				</group>
				<group ref={duduk} visible={false}>
					<Tokoh penampilan={penampilan} pose="duduk" />
				</group>
			</group>
			<sprite ref={spLabel} scale={[1.9, 0.27, 1]} visible={false} renderOrder={11}>
				<spriteMaterial map={label.t} transparent depthTest={false} />
			</sprite>
			<Hiasan sumber={() => pemainLain.get(id) || {}} tinggiRef={tinggi} lihat={lihat} posisiRef={tampil} />
		</>
	);
}

// Balon chat & emote milik pemain sendiri.
function HiasanSendiri() {
	const pos = useRef({ x: 0, y: 0, z: 0 });
	const tinggi = useRef(2.05);
	const lihat = useRef(true);
	useFrame(() => {
		pos.current.x = posisi.x;
		pos.current.y = posisi.yTampil ?? posisi.y;
		pos.current.z = posisi.z;
		tinggi.current = posisi.pose === "mobil" ? 1.85 : posisi.pose === "motor" ? 2.0 : posisi.pose === "duduk" ? 1.65 : 2.05;
	});
	return <Hiasan sumber={() => diriSendiri} tinggiRef={tinggi} lihat={lihat} posisiRef={pos} />;
}

export default function PemainLain() {
	const { daftar, status } = useMultipemain();
	return (
		<>
			{daftar.map((p) => (
				<Tamu key={p.id} id={p.id} nama={p.nama} jk={p.jk} avatar={p.avatar} kulit={p.kulit} />
			))}
			{status === "tersambung" && <HiasanSendiri />}
		</>
	);
}
