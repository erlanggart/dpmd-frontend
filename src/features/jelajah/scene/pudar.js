import { useEffect, useRef } from "react";

// Daftarkan semua mesh dalam grup ke daftar dinding lantai dasar supaya ikut dipudarkan
// Pemain saat menghalangi pandangan kamera (atap toko, tenda, dsb). Tiap mesh perlu bahan
// sendiri (bukan bahan bersama), karena opasitasnya diubah per mesh.
export function usePudar(daftarDinding) {
	const grup = useRef();
	useEffect(() => {
		if (!daftarDinding) return;
		const mesh = [];
		grup.current.traverse((o) => {
			if (!o.isMesh) return;
			o.userData.bahan = [o.material];
			mesh.push(o);
		});
		const daftar = daftarDinding.current[0];
		daftar.push(...mesh);
		return () => mesh.forEach((m) => daftar.splice(daftar.indexOf(m), 1));
	}, [daftarDinding]);
	return grup;
}
