/**
 * useAksesCctv — izin Smart CCTV pengguna yang sedang masuk:
 *   lihat (live & playback) · peringatan (peringatan, riwayat, analitik)
 *   kamera (kelola perangkat) · wajah (data wajah terdaftar)
 * Superadmin selalu memiliki semuanya dan satu-satunya yang bisa mengatur akses.
 * Hasilnya disimpan bersama (satu permintaan untuk semua komponen).
 */
import { useEffect, useState } from "react";
import { getAksesSaya } from "../api/smartCctvApi";

let janji = null;
let hasil = null;

const muat = () => {
	if (!janji) {
		janji = getAksesSaya()
			.then((r) => (hasil = r.data?.data || { izin: [], superadmin: false }))
			.catch(() => (hasil = { izin: [], superadmin: false }))
			.finally(() => setTimeout(() => (janji = null), 60000)); // segarkan sesekali
	}
	return janji;
};

/** Bagian halaman → izin yang dibutuhkan. */
export const IZIN_HALAMAN = {
	"": "lihat",
	playback: "lihat",
	peringatan: "peringatan",
	riwayat: "peringatan",
	analitik: "peringatan",
	kamera: "kamera",
	wajah: "wajah",
	akses: "superadmin",
};

export const bolehBuka = (akses, bagian) => {
	const perlu = IZIN_HALAMAN[bagian] ?? "lihat";
	if (!akses) return false;
	if (perlu === "superadmin") return !!akses.superadmin;
	return akses.superadmin || akses.izin.includes(perlu);
};

export function useAksesCctv() {
	const [akses, setAkses] = useState(hasil);
	useEffect(() => {
		let hidup = true;
		muat().then((a) => hidup && setAkses(a));
		return () => {
			hidup = false;
		};
	}, []);
	return { akses, memuat: !akses, adaAkses: !!akses && (akses.superadmin || akses.izin.length > 0) };
}
