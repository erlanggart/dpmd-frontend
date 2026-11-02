import { useSyncExternalStore } from "react";

// Tenaga (nyawa) pengunjung 0–100: berkurang perlahan seiring waktu, lebih cepat saat
// berlari & adu tarik dengan ikan, dan banyak saat tertabrak kendaraan. Diisi ulang dengan
// makan/minum dari minimarket. Habis = pingsan, lalu bangun di depan lobi.

const KUNCI = "jelajah-tenaga-v1";
export const TENAGA_MAKS = 100;
export const TENAGA_LARI = 20; // di bawah ini tidak bisa berlari

function baca() {
	try {
		const n = Number(localStorage.getItem(KUNCI));
		if (Number.isFinite(n) && n > 0) return Math.min(TENAGA_MAKS, n);
	} catch {
		/* penyimpanan tidak tersedia */
	}
	return TENAGA_MAKS;
}

// `tabrak`: dorongan yang belum dijalankan Pemain { vx, vz, kuat, jenis }.
export const tenaga = { nilai: baca(), tabrak: null, pingsan: false, kabar: null };

const pendengar = new Set();
let tampil = Math.round(tenaga.nilai);
let terakhirSimpan = 0;
function beritahu(paksa = false) {
	const bulat = Math.round(tenaga.nilai);
	if (!paksa && bulat === tampil) return;
	tampil = bulat;
	pendengar.forEach((fn) => fn());
	const kini = performance.now();
	if (paksa || kini - terakhirSimpan > 3000) {
		terakhirSimpan = kini;
		try {
			localStorage.setItem(KUNCI, String(tenaga.nilai));
		} catch {
			/* abaikan */
		}
	}
}

export function ubahTenaga(delta, kabar) {
	tenaga.nilai = Math.max(0, Math.min(TENAGA_MAKS, tenaga.nilai + delta));
	if (kabar) tenaga.kabar = { ...kabar, id: performance.now() };
	beritahu(!!kabar);
}

export function setTenaga(n) {
	tenaga.nilai = Math.max(0, Math.min(TENAGA_MAKS, n));
	beritahu(true);
}

// Dipanggil lalu lintas / kendaraan tamu lain yang menghantam pengunjung.
let jedaTabrak = 0;
export function laporTabrak({ vx, vz, laju, jenis }) {
	const kini = performance.now();
	if (kini < jedaTabrak || tenaga.pingsan) return;
	jedaTabrak = kini + 1800;
	const kuat = Math.min(1.6, laju / 8);
	const kurang = Math.round((jenis === "motor" ? 14 : 24) * (0.6 + kuat * 0.6));
	const pj = Math.hypot(vx, vz) || 1;
	tenaga.tabrak = { vx: vx / pj, vz: vz / pj, kuat, jenis };
	ubahTenaga(-kurang, { teks: `Tertabrak ${jenis}! Tenaga −${kurang}`, jenis: "buruk" });
}

export const useTenaga = () =>
	useSyncExternalStore(
		(fn) => (pendengar.add(fn), () => pendengar.delete(fn)),
		() => tampil,
	);
// Kabar terakhir (tertabrak, makan, pingsan) untuk toast UI.
export const useKabarTenaga = () =>
	useSyncExternalStore(
		(fn) => (pendengar.add(fn), () => pendengar.delete(fn)),
		() => tenaga.kabar,
	);
