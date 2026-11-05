import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, Vector3 } from "three";
import { SUDUT_UTARA } from "./kawasanData";
import { malamMenurutJam, suasana } from "./suasana";
import { langit } from "./warnaLangit";

// Suasana mengikuti jam WIB: warna langit, kabut, dan cahaya mengikuti palet per jam (fajar &
// senja jingga), matahari terbit di timur dan terbenam di barat. `suasana.malam` tetap penanda
// lampu & jendela (17.30–18.30). Warna & arah untuk kubah langit ada di `langit` (lihat Langit.jsx).

// [jam, atas, cakrawala, kabut, warna cahaya]
const PALET = [
	[0, "#0a1430", "#1b2a4c", "#0d1830", "#9db4ff"],
	[4.8, "#0a1430", "#1b2a4c", "#0d1830", "#9db4ff"],
	[6, "#46679c", "#f6b48a", "#e9bc98", "#ffb070"],
	[7.6, "#1668cf", "#cfe6f5", "#cfe6f1", "#fff3dc"],
	[16.6, "#1668cf", "#cfe6f5", "#cfe6f1", "#fff3dc"],
	[18, "#3a4c88", "#f59a68", "#e7a37c", "#ff8a4c"],
	[19.2, "#0a1430", "#1b2a4c", "#0d1830", "#9db4ff"],
	[24, "#0a1430", "#1b2a4c", "#0d1830", "#9db4ff"],
].map(([jam, atas, cakrawala, kabut, cahaya]) => ({ jam, atas: new Color(atas), cakrawala: new Color(cakrawala), kabut: new Color(kabut), cahaya: new Color(cahaya) }));
const KUNCI_WARNA = ["atas", "cakrawala", "kabut", "cahaya"];
// jam yang dipakai saat suasana dipaksa lewat tombol
const JAM_PAKSA = { siang: 12, senja: 17.85, malam: 23 };
const MALAM_PAKSA = { siang: 0, senja: 0.3, malam: 1 };

const TANAH_BAWAH = [new Color("#a8a49b"), new Color("#2b2a35")];
const LANGIT_ATAS = [new Color("#ffffff"), new Color("#7d8fc2")];
// langit mendung saat hujan
const MENDUNG = new Color("#7d8a96");
const MENDUNG_MALAM = new Color("#1a2029");
const MENDUNG_ATAS = new Color("#5b6b7c");
const MENDUNG_ATAS_MALAM = new Color("#141a24");
const bantuWarna = new Color();
const bantuAtas = new Color();

// Sudut berkurang searah jarum jam pada kompas (lihat arahPeta di ui/MinimapKabupaten.jsx).
const UTARA = -SUDUT_UTARA;
const TIMUR = new Vector3(Math.sin(UTARA - Math.PI / 2), 0, Math.cos(UTARA - Math.PI / 2));
const SELATAN = new Vector3(Math.sin(UTARA + Math.PI), 0, Math.cos(UTARA + Math.PI));
const POSISI_BULAN = new Vector3(12, 25, 10);
const POSISI_MATAHARI = new Vector3();

const halus = { atas: new Color(), cakrawala: new Color(), kabut: new Color(), cahaya: new Color() };
const jamWib = (d = new Date()) => ((d.getUTCHours() + 7) % 24) + d.getUTCMinutes() / 60;

export default function SiangMalam() {
	const scene = useThree((s) => s.scene);
	const hemi = useRef();
	const sinar = useRef();
	const jam = useRef({ t: 1e9, malam: 0, jam: 12, siap: false });

	useFrame((_, dt) => {
		// jam dibaca tiap beberapa detik saja
		const j = jam.current;
		j.t += dt;
		if (j.t > 5) {
			j.t = 0;
			j.malam = malamMenurutJam();
			j.jam = jamWib();
		}
		const paksa = suasana.paksa;
		const target = paksa ? MALAM_PAKSA[paksa] : j.malam;
		const kini = paksa ? JAM_PAKSA[paksa] : j.jam;
		const m = Math.abs(target - suasana.malam) < 0.002 ? target : suasana.malam + (target - suasana.malam) * (1 - Math.exp(-2.5 * dt));
		suasana.malam = m;
		const h = suasana.hujan;

		// warna palet di jam ini; dihaluskan supaya tombol suasana tidak berganti mendadak
		let i = 0;
		while (i < PALET.length - 2 && kini > PALET[i + 1].jam) i++;
		const a = PALET[i];
		const b = PALET[i + 1];
		const u = Math.max(0, Math.min(1, (kini - a.jam) / (b.jam - a.jam)));
		const laju = j.siap ? 1 - Math.exp(-2.5 * dt) : 1;
		j.siap = true;
		for (const k of KUNCI_WARNA) halus[k].lerp(bantuWarna.copy(a[k]).lerp(b[k], u), laju);

		// mendung menutup warna langit
		bantuWarna.lerpColors(MENDUNG, MENDUNG_MALAM, m);
		bantuAtas.lerpColors(MENDUNG_ATAS, MENDUNG_ATAS_MALAM, m);
		langit.atas.copy(halus.atas).lerp(bantuAtas, h * 0.85);
		langit.cakrawala.copy(halus.cakrawala).lerp(bantuWarna, h * 0.85);
		langit.kabut.copy(halus.kabut).lerp(bantuWarna, h * 0.75);
		langit.cahaya.copy(halus.cahaya);

		// matahari: pukul 6 di timur, pukul 12 di puncak (sedikit ke selatan), pukul 18 di barat
		const sudut = ((kini - 6) / 12) * Math.PI;
		langit.arah.copy(TIMUR).multiplyScalar(Math.cos(sudut)).addScaledVector(SELATAN, 0.18);
		langit.arah.y = Math.sin(sudut);
		langit.arah.normalize();

		if (scene.background?.isColor) scene.background.copy(langit.kabut);
		if (scene.fog) {
			scene.fog.color.copy(langit.kabut);
			// hujan: pandangan memendek
			scene.fog.near = 80 - 55 * h;
			scene.fog.far = 330 - 190 * h;
		}
		hemi.current.color.lerpColors(LANGIT_ATAS[0], LANGIT_ATAS[1], m);
		hemi.current.groundColor.lerpColors(TANAH_BAWAH[0], TANAH_BAWAH[1], m);
		hemi.current.intensity = (1.15 - 0.45 * m) * (1 - 0.25 * h);
		sinar.current.color.copy(langit.cahaya);
		sinar.current.intensity = (1.5 - 1.15 * m) * (1 - 0.6 * h);
		// cahaya datang dari arah matahari; malam kembali ke arah bulan yang tetap
		POSISI_MATAHARI.copy(langit.arah).multiplyScalar(30);
		POSISI_MATAHARI.y = Math.max(5, POSISI_MATAHARI.y);
		sinar.current.position.lerpVectors(POSISI_MATAHARI, POSISI_BULAN, m);
	});

	return (
		<>
			<hemisphereLight ref={hemi} args={["#ffffff", "#a8a49b", 1.15]} />
			<directionalLight ref={sinar} position={[12, 25, 10]} intensity={1.5} color="#fff3dc" />
		</>
	);
}
