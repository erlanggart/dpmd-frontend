import api from "../../api";
import { tanda } from "./tandaJelajah";

// Kode simpan: salinan kemajuan (semua kunci localStorage berawalan "jelajah") di server,
// supaya bisa dipindah antarperangkat. Tanpa akun; siapa pun yang tahu kodenya bisa memakainya.

const KUNCI_KODE = "jelajah-kode-simpan";
const KUNCI_SAH = /^jelajah[-:][a-zA-Z0-9:._-]{1,60}$/;

const kunciJelajah = () => Object.keys(localStorage).filter((k) => k.startsWith("jelajah"));

function kumpulkan() {
	const data = {};
	for (const k of kunciJelajah()) if (k !== KUNCI_KODE) data[k] = localStorage.getItem(k);
	return data;
}

export const kodeSaya = () => {
	try {
		return localStorage.getItem(KUNCI_KODE);
	} catch {
		return null;
	}
};

const PESAN = { 404: "Kode tidak ditemukan", 413: "Simpanan terlalu besar", 429: "Terlalu sering, coba lagi nanti", 503: "Penyimpanan sedang penuh" };
const galat = (e) => Object.assign(new Error(PESAN[e?.response?.status] || "Gagal terhubung"), { status: e?.response?.status });

/** Simpan ke server; mengembalikan kodenya. Kode lama yang sudah hilang diganti kode baru. */
export async function simpanKeKode() {
	const data = kumpulkan();
	let kode = kodeSaya();
	try {
		if (kode) {
			try {
				await api.put(`/public/jelajah/simpanan/${kode}`, { data });
			} catch (e) {
				if (e?.response?.status !== 404) throw e;
				kode = null;
			}
		}
		if (!kode) kode = (await api.post("/public/jelajah/simpanan", { data })).data.kode;
	} catch (e) {
		throw galat(e);
	}
	try {
		localStorage.setItem(KUNCI_KODE, kode);
	} catch {
		/* penyimpanan tidak tersedia */
	}
	tanda("kode-simpan");
	return kode;
}

/** Ganti seluruh kemajuan di perangkat ini dengan isi kode, lalu muat ulang halaman. */
export async function pulihkanDariKode(kode) {
	let data;
	try {
		data = (await api.get(`/public/jelajah/simpanan/${encodeURIComponent(kode.trim().toUpperCase())}`)).data.data;
	} catch (e) {
		throw galat(e);
	}
	const kunci = Object.keys(data || {});
	if (!kunci.length || !kunci.every((k) => KUNCI_SAH.test(k) && typeof data[k] === "string")) throw new Error("Isi simpanan tidak valid");
	for (const k of kunciJelajah()) localStorage.removeItem(k);
	for (const k of kunci) localStorage.setItem(k, data[k]);
	localStorage.setItem(KUNCI_KODE, kode.trim().toUpperCase());
	location.reload();
}
