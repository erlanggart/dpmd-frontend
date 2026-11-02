import { useSyncExternalStore } from "react";
import { tambahKoin } from "./pancing";
import { catat, catatBalap, progres, tambahXp } from "./progres";
import { suara } from "./suaraPancing";
import { ubahTenaga } from "./tenaga";

// Balapan motor melawan waktu di Jl. KSR Dadi Kusmayadi depan kantor: dari garis start ke
// timur sampai belokan, putar balik ke barat sampai ujung, lalu kembali ke garis finis.
// Lewati gerbang cek (cincin) berurutan. Rekor tersimpan di progres & papan peringkat.

export const START = { x: -18, z: 35.6, rot: -Math.PI / 2 };
export const JARAK_START = 6;
export const CHECKPOINT = [
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
const RADIUS_CP = 5.5;
const HITUNG_MUNDUR = 3000;

// fase: null | "hitung" | "jalan"; mulai = waktu GO (ms); cp = indeks gerbang berikutnya
export const balap = { fase: null, hitungSampai: 0, mulai: 0, cp: 0, hasil: null };

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

export function mulaiBalap() {
	if (balap.fase) return;
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
	const cp = CHECKPOINT[balap.cp];
	if (Math.hypot(x - cp.x, z - cp.z) < RADIUS_CP) {
		balap.cp++;
		if (balap.cp >= CHECKPOINT.length) selesai((kini - balap.mulai) / 1000);
		else suara("koin");
		beritahu();
	}
	return false;
}

function selesai(detik) {
	const lama = progres.balap;
	const rekor = catatBalap(detik);
	const koin = rekor && lama != null ? 120 : 60;
	tambahKoin(koin);
	tambahXp(60);
	catat("balap");
	balap.fase = null;
	balap.hasil = { detik, rekor, koin };
	suara("jaya");
	ubahTenaga(0, { teks: `🏁 Finis ${detik.toFixed(2)} dtk${rekor ? " — REKOR BARU!" : ""} · +🪙${koin}`, jenis: "baik" });
	setTimeout(() => {
		balap.hasil = null;
		beritahu();
	}, 6000);
}
