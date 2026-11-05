import { useSyncExternalStore } from "react";

// Misi cerita dan harian tidak wajib: tamu memilih sendiri untuk mengikutinya. Selama tidak
// diikuti, misi berhenti (tanpa kartu, kompas, perayaan, atau kemajuan) dan bisa dilanjutkan kapan saja.
const KUNCI = "jelajah-ikut-misi-v1";
let ikut = false;
try {
	ikut = localStorage.getItem(KUNCI) === "1";
} catch {
	/* penyimpanan diblokir: pilihan bertahan selama halaman terbuka */
}

const pendengar = new Set();
export const ikutMisi = () => ikut;
export function aturIkutMisi(nilai) {
	ikut = nilai;
	try {
		localStorage.setItem(KUNCI, nilai ? "1" : "0");
	} catch {
		/* lihat di atas */
	}
	pendengar.forEach((f) => f());
}
export const useIkutMisi = () => useSyncExternalStore((f) => (pendengar.add(f), () => pendengar.delete(f)), () => ikut);
