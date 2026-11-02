import { useSyncExternalStore } from "react";
import { tambahKoin } from "./pancing";
import { suara } from "./suaraPancing";
import { ubahTenaga } from "./tenaga";
import { catat, tambahXp } from "./progres";

// Peti hadiah yang tersebar di kantor & halaman (posisinya: scene/layout.js → PETI_HADIAH).
// Dibuka = koin acak masuk dompet; peti terisi lagi setelah JEDA_PETI. Waktu buka tiap peti
// tersimpan di perangkat supaya tidak bisa dibuka ulang dengan memuat ulang halaman.

export const JEDA_PETI = 15 * 60 * 1000;
const KUNCI = "jelajah-peti-v1";

function baca() {
	try {
		const d = JSON.parse(localStorage.getItem(KUNCI));
		if (d && typeof d === "object") return d;
	} catch {
		/* penyimpanan tidak tersedia */
	}
	return {};
}

// dibuka: id → waktu dibuka (ms); ledak: semburan koin terakhir untuk animasi
export const harta = { dibuka: baca(), ledak: null };

let versi = 0;
const pendengar = new Set();
const beritahu = () => {
	versi++;
	pendengar.forEach((f) => f());
};
export const useHarta = () =>
	useSyncExternalStore(
		(f) => (pendengar.add(f), () => pendengar.delete(f)),
		() => versi,
	);

export const petiSiap = (id) => !harta.dibuka[id] || Date.now() - harta.dibuka[id] > JEDA_PETI;

function isi(emas) {
	const r = Math.random();
	if (emas) return r < 0.15 ? 250 + Math.floor(Math.random() * 150) : 90 + Math.floor(Math.random() * 80);
	return r < 0.08 ? 120 + Math.floor(Math.random() * 60) : r < 0.4 ? 35 + Math.floor(Math.random() * 35) : 10 + Math.floor(Math.random() * 22);
}

export function bukaPeti(peti) {
	if (!peti || !petiSiap(peti.id)) return;
	const n = isi(peti.emas);
	harta.dibuka = { ...harta.dibuka, [peti.id]: Date.now() };
	try {
		localStorage.setItem(KUNCI, JSON.stringify(harta.dibuka));
	} catch {
		/* abaikan */
	}
	tambahKoin(n);
	harta.ledak = { id: peti.id, n, t0: performance.now() };
	suara("koin");
	catat("peti");
	tambahXp(Math.round(n / 3) + 5);
	ubahTenaga(0, { teks: `${peti.emas ? "👑 Peti emas" : "🎁 Peti hadiah"}: +${n} koin! Terisi lagi 15 menit`, jenis: "baik" });
	beritahu();
}
