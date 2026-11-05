import api from "../../api";

// Penghitung pemakaian anonim: tiap peristiwa dikirim sekali per muat halaman.
const terkirim = new Set();
export function tanda(peristiwa) {
	if (import.meta.env.DEV || terkirim.has(peristiwa)) return;
	terkirim.add(peristiwa);
	api.post("/public/jelajah/tanda", { peristiwa }).catch(() => {});
}
