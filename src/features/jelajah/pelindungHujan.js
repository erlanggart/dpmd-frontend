import { useSyncExternalStore } from "react";
import { bayarKoin } from "./pancing";
import { suara } from "./suaraPancing";
import { ubahTenaga } from "./tenaga";

// Hujan menguras tenaga di luar ruangan. Pelindung (payung / jas hujan) dibeli sekali dari
// abang pedagang yang muncul saat hujan, masuk tas, lalu dipakai otomatis. Payung dilipat bila
// tangan sibuk (bertani, duduk, berkendara); saat mancing payung ditancap di samping pemain
// (lihat PayungTancap). Jas hujan menutup semua aktivitas.

const KUNCI = "jelajah-pelindung-v1";

export const PELINDUNG = {
	payung: {
		id: "payung",
		nama: "Payung Lipat",
		ikon: "☂️",
		harga: 60,
		bisa: "Jalan, lari, berdiri, dan mancing di luar",
		tidak: "Dilipat saat bertani, duduk, atau mengemudikan motor & perahu",
	},
	jas: {
		id: "jas",
		nama: "Jas Hujan",
		ikon: "🧥",
		harga: 180,
		bisa: "Semua aktivitas: mancing, bertani, naik motor & perahu",
		tidak: null,
	},
};

// tenaga per detik saat kehujanan (100 habis ±8 menit)
export const KURAS_HUJAN = 0.2;

function baca() {
	try {
		const t = JSON.parse(localStorage.getItem(KUNCI));
		if (t && typeof t === "object") return { payung: !!t.payung, jas: !!t.jas };
	} catch {
		/* penyimpanan tidak tersedia */
	}
	return { payung: false, jas: false };
}

let milik = baca();
let status = null; // null | "teduh" | "payung" | "jas" | "kehujanan"
let versiMilik = 0;
let ditegur = false;
const pendengar = new Set();
const beritahu = () => pendengar.forEach((fn) => fn());
const langganan = (fn) => (pendengar.add(fn), () => pendengar.delete(fn));

export function beliPelindung(id) {
	const p = PELINDUNG[id];
	if (milik[id]) return { ok: false, pesan: "Sudah punya" };
	if (!bayarKoin(p.harga)) return { ok: false, pesan: "Koin belum cukup. Berteduh dulu, atau cari koin dari memancing" };
	milik = { ...milik, [id]: true };
	versiMilik++;
	try {
		localStorage.setItem(KUNCI, JSON.stringify(milik));
	} catch {
		/* abaikan */
	}
	suara("koin");
	ubahTenaga(0, { teks: `${p.ikon} ${p.nama} masuk tas! Otomatis dipakai saat hujan`, jenis: "baik" });
	beritahu();
	return { ok: true };
}

// Dipanggil tiap frame oleh pemain. Mengembalikan kuras tenaga per detik (0 bila terlindung).
// gr = objek gerak pemain (gr.payung 0..1 = seberapa terbuka payung di tangan).
export function langkahHujan(lebat, teduh, tanganSibuk, gr, dt, petunjuk) {
	const baru = lebat <= 0.3 ? null : milik.jas ? "jas" : teduh ? "teduh" : milik.payung && !tanganSibuk ? "payung" : "kehujanan";
	gr.payung = (gr.payung ?? 0) + ((baru === "payung" ? 1 : 0) - (gr.payung ?? 0)) * (1 - Math.exp(-6 * dt));
	if (baru !== status) {
		status = baru;
		beritahu();
		if (baru === "kehujanan" && !ditegur) {
			ditegur = true;
			ubahTenaga(0, { teks: petunjuk(), jenis: "buruk" });
		}
		if (baru === null) ditegur = false;
	}
	return baru === "kehujanan" ? KURAS_HUJAN * lebat : 0;
}

export const useStatusHujan = () => useSyncExternalStore(langganan, () => status);
export const useMilikHujan = () => {
	useSyncExternalStore(langganan, () => versiMilik);
	return milik;
};
