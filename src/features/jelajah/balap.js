import { useSyncExternalStore } from "react";
import { tambahKoin } from "./pancing";
import { catat, catatBalap, progres, tambahXp } from "./progres";
import { GERBANG_SIRKUIT, JALUR_SIRKUIT, PANJANG_SIRKUIT } from "./ruteBalap";
import { suara } from "./suaraPancing";
import { ubahTenaga } from "./tenaga";

// Balapan motor melawan waktu, berangkat & finis di gerbang 🏁 depan kantor. Dua trek:
// - sprint : Jl. KSR Dadi Kusmayadi — ke timur sampai belokan, putar balik ke barat, kembali;
// - sirkuit: putaran ±2,4 km menyusuri jalan-jalan kawasan Pemda (ruteBalap.js).
// Lewati gerbang cek (cincin) berurutan. Rekor per trek tersimpan di progres & papan peringkat.

export const START = { x: -18, z: 35.6 };
export const JARAK_START = 6;
const SPRINT = [
	{ x: -45, z: 35.6 },
	{ x: -78, z: 36.4 },
	{ x: -104, z: 41.5 },
	{ x: -80, z: 36.4 },
	{ x: -40, z: 35.6 },
	{ x: 10, z: 35.6 },
	{ x: 45, z: 35.6 },
	{ x: 64, z: 35 },
	{ x: 30, z: 35.6 },
	{ x: START.x, z: START.z },
];
const jalurDari = (cp) => [[START.x, START.z], ...cp.map((c) => [c.x, c.z])];

export const TREK = {
	sprint: { id: "sprint", nama: "Sprint Depan Kantor", ket: "Jalan depan kantor bolak-balik — cepat & lurus", panjang: 380, gerbang: SPRINT, jalur: jalurDari(SPRINT), hadiah: [60, 120], xp: 60 },
	sirkuit: {
		id: "sirkuit",
		nama: "Sirkuit Kawasan Pemda",
		ket: "Menyusuri jalan-jalan kawasan Pemda, belok-belok & panjang",
		panjang: PANJANG_SIRKUIT,
		gerbang: GERBANG_SIRKUIT.map(([x, z]) => ({ x, z })),
		jalur: JALUR_SIRKUIT,
		hadiah: [180, 350],
		xp: 160,
	},
};
const RADIUS_CP = 6.5;
const HITUNG_MUNDUR = 3000;

// fase: null | "hitung" | "jalan"; trek: id trek; cp = indeks gerbang berikutnya
export const balap = { fase: null, trek: null, hitungSampai: 0, mulai: 0, cp: 0, hasil: null };
export const trekKini = () => TREK[balap.trek] || TREK.sprint;

let versi = 0;
const pendengar = new Set();
const beritahu = () => {
	versi++;
	pendengar.forEach((f) => f());
};
export const useBalap = () =>
	useSyncExternalStore(
		(f) => (pendengar.add(f), () => pendengar.delete(f)),
		() => versi,
	);

export const dekatStart = (x, z) => Math.hypot(x - START.x, z - START.z) < JARAK_START;

export function mulaiBalap(trek = "sprint") {
	if (balap.fase || !TREK[trek]) return;
	balap.trek = trek;
	balap.fase = "hitung";
	balap.hitungSampai = performance.now() + HITUNG_MUNDUR;
	balap.cp = 0;
	balap.hasil = null;
	suara("klik");
	beritahu();
}

export function batalBalap(alasan) {
	if (!balap.fase) return;
	balap.fase = null;
	if (alasan) ubahTenaga(0, { teks: alasan, jenis: "buruk" });
	beritahu();
}

// Dipanggil Pemain tiap frame selama mengemudikan motor. Mengembalikan true bila motor
// harus ditahan (hitung mundur).
export function tickBalap(x, z) {
	if (!balap.fase) return false;
	const kini = performance.now();
	if (balap.fase === "hitung") {
		if (kini < balap.hitungSampai) return true;
		balap.fase = "jalan";
		balap.mulai = kini;
		suara("jaya");
		beritahu();
		return false;
	}
	const gerbang = trekKini().gerbang;
	const cp = gerbang[balap.cp];
	if (Math.hypot(x - cp.x, z - cp.z) < RADIUS_CP) {
		balap.cp++;
		if (balap.cp >= gerbang.length) selesai((kini - balap.mulai) / 1000);
		else suara("koin");
		beritahu();
	}
	return false;
}

function selesai(detik) {
	const t = trekKini();
	const lama = progres.rekor?.[t.id];
	const rekor = catatBalap(t.id, detik);
	const koin = rekor && lama != null ? t.hadiah[1] : t.hadiah[0];
	tambahKoin(koin);
	tambahXp(t.xp);
	catat("balap");
	balap.fase = null;
	balap.hasil = { detik, rekor, koin, xp: t.xp, trek: t.nama };
	suara("jaya");
	ubahTenaga(0, { teks: `🏁 ${t.nama}: ${detik.toFixed(2)} dtk${rekor ? " — REKOR BARU!" : ""} · +🪙${koin}`, jenis: "baik" });
	setTimeout(() => {
		balap.hasil = null;
		beritahu();
	}, 7000);
}
