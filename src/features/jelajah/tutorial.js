import { useEffect, useState } from "react";

// Petunjuk cara main cukup tampil sekali per perangkat, lalu tidak mengganggu lagi.
const KUNCI = "jelajah-tutorial-v1";
const sudah = (() => {
	try {
		return new Set(JSON.parse(localStorage.getItem(KUNCI)) || []);
	} catch {
		return new Set();
	}
})();

function tandai(id) {
	sudah.add(id);
	try {
		localStorage.setItem(KUNCI, JSON.stringify([...sudah]));
	} catch {
		/* penyimpanan tidak tersedia: paling buruk petunjuk tampil lagi saat muat ulang */
	}
}

// Untuk pesan di luar React: benar hanya pada pemanggilan pertama.
export function tutorialBaru(id) {
	if (sudah.has(id)) return false;
	tandai(id);
	return true;
}

// Petunjuk tampil `lama` ms sejak `aktif`. Baru ditandai setelah sempat tampil penuh, supaya
// keadaan yang berganti sekejap tidak menghabiskan satu-satunya kesempatan.
export function useTutorial(id, aktif, lama = 8000) {
	const [tampil, setTampil] = useState(false);
	useEffect(() => {
		if (!aktif || sudah.has(id)) return undefined;
		setTampil(true);
		const t = setTimeout(() => {
			tandai(id);
			setTampil(false);
		}, lama);
		return () => {
			clearTimeout(t);
			setTampil(false);
		};
	}, [id, aktif, lama]);
	return tampil;
}
