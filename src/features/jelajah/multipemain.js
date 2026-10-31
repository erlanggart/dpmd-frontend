import { useSyncExternalStore } from "react";
import { asalSocket } from "../../utils/asalServer";
import { posisi } from "./jelajahStore";
import { kendaraanDariId } from "./scene/kendaraan";

// Jelajah bersama: setiap tamu yang membuka /jelajah tersambung ke namespace
// socket.io "/jelajah" (lihat dpmd-fahri-express/src/socket/jelajah.socket.js).
// Posisi pemain lain disimpan di Map mutable yang dibaca tiap frame oleh
// PemainLain; hanya hal yang jarang berubah (daftar pemain, obrolan, sapaan)
// yang memicu render React.

const JEDA_KIRIM = 100;
const LAMA_UCAP = 7000;
const LAMA_EMOTE = 2600;
const MAKS_OBROLAN = 40;
// Tab yang ditinggal lebih lama dari ini melepas kursinya (server hanya 10 tamu).
const LEPAS_SAAT_TERSEMBUNYI_MS = 2 * 60 * 1000;

// id → { profil, s: keadaan terakhir dari server, ucap, emote }
export const pemainLain = new Map();
// Balon chat & emote milik pemain sendiri, digambar di atas kepalanya.
export const diriSendiri = { ucap: null, emote: null };

let ringkas = { status: "mati", id: null, daftar: [], obrolan: [], sapaan: null, galat: null };
const pendengar = new Set();
function ubah(patch) {
	ringkas = { ...ringkas, ...patch };
	pendengar.forEach((fn) => fn());
}
const langganan = (fn) => {
	pendengar.add(fn);
	return () => pendengar.delete(fn);
};
export const useMultipemain = () => useSyncExternalStore(langganan, () => ringkas);

const daftarDariMap = () => [...pemainLain.entries()].map(([id, p]) => ({ id, ...p.profil }));

function tambahObrolan(m) {
	ubah({ obrolan: [...ringkas.obrolan, m].slice(-MAKS_OBROLAN) });
}

// Kendaraan yang sedang dikemudikan tamu lain tidak bisa dinaiki.
export function kendaraanDipakaiLain(id) {
	for (const p of pemainLain.values()) if (p.s?.kend?.id === id) return true;
	return false;
}

let socket = null;
// Naik setiap sambung/putus, supaya sambungan yang masih memuat pustaka dibatalkan.
let generasi = 0;
let pengirim = null;
let lepasTersembunyi = null;

// Pustaka socket.io baru diunduh saat tamu memilih jelajah bersama; mode sendiri
// tidak menyentuh server multipemain sama sekali.
export async function sambungJelajah(profil) {
	putusJelajah();
	const saya = ++generasi;
	ubah({ status: "menyambung", galat: null });
	let io;
	try {
		({ io } = await import("socket.io-client"));
	} catch {
		if (saya === generasi) ubah({ status: "terputus", galat: "Gagal memuat koneksi tamu." });
		return;
	}
	if (saya !== generasi) return;
	const asal = asalSocket();
	socket = io(`${asal ?? ""}/jelajah`, {
		auth: { nama: profil.nama, jk: profil.jk, avatar: profil.avatar, kulit: profil.kulit },
		transports: ["polling", "websocket"],
		reconnectionDelayMax: 8000,
	});
	const s = socket;

	s.on("connect_error", (e) => {
		const pesan =
			e?.message === "penuh"
				? "Jelajah bersama sedang penuh (maks. 10 tamu). Anda tetap bisa menjelajah sendiri."
				: e?.message === "terlalu-banyak"
					? "Terlalu banyak tamu dari jaringan ini."
					: null;
		ubah({ status: "terputus", galat: pesan });
		if (pesan && ringkas.obrolan.at(-1)?.teks !== pesan) tambahObrolan({ sistem: true, teks: pesan, waktu: Date.now() });
	});
	s.on("disconnect", () => {
		pemainLain.clear();
		ubah({ status: "terputus", daftar: [] });
	});
	s.on("selamat", (m) => {
		pemainLain.clear();
		for (const p of m.pemain || []) pemainLain.set(p.id, { profil: { nama: p.nama, jk: p.jk, avatar: p.avatar, kulit: p.kulit }, s: p.s });
		// Mobil & motor yang sudah dipindahkan tamu lain sebelum kita masuk.
		for (const [id, k] of Object.entries(m.kendaraan || {})) {
			const kend = kendaraanDariId(id);
			if (kend && posisi.kend !== kend) Object.assign(kend, { x: k.x, z: k.z, rot: k.rot });
		}
		ubah({ status: "tersambung", id: m.id, daftar: daftarDariMap(), galat: null });
	});
	s.on("masuk", (p) => {
		pemainLain.set(p.id, { profil: { nama: p.nama, jk: p.jk, avatar: p.avatar, kulit: p.kulit }, s: p.s });
		ubah({ daftar: daftarDariMap() });
		tambahObrolan({ sistem: true, teks: `${p.nama} masuk ke kantor`, waktu: Date.now() });
	});
	s.on("keluar", ({ id }) => {
		const p = pemainLain.get(id);
		if (!p) return;
		pemainLain.delete(id);
		ubah({ daftar: daftarDariMap() });
		tambahObrolan({ sistem: true, teks: `${p.profil.nama} meninggalkan kantor`, waktu: Date.now() });
	});
	s.on("posisi", (daftar) => {
		for (const { id, s: st } of daftar) {
			const p = pemainLain.get(id);
			if (p) p.s = st;
		}
	});
	s.on("ucap", (m) => {
		const sampai = performance.now() + LAMA_UCAP;
		if (m.id === s.id) diriSendiri.ucap = { teks: m.teks, sampai };
		else {
			const p = pemainLain.get(m.id);
			if (p) p.ucap = { teks: m.teks, sampai };
		}
		tambahObrolan({ id: m.id, nama: m.nama, teks: m.teks, waktu: m.waktu, sendiri: m.id === s.id });
	});
	s.on("emote", (m) => {
		const e = { jenis: m.jenis, sampai: performance.now() + LAMA_EMOTE };
		if (m.id === s.id) diriSendiri.emote = e;
		else {
			const p = pemainLain.get(m.id);
			if (p) p.emote = e;
		}
	});
	s.on("disapa", (m) => ubah({ sapaan: { ...m, waktu: Date.now() } }));
	s.on("ditolak", (m) => tambahObrolan({ sistem: true, teks: m.alasan, waktu: Date.now() }));

	// Kirim posisi sendiri ±10x per detik, hanya bila berubah.
	let terakhir = "";
	pengirim = setInterval(() => {
		if (!s.connected) return;
		const k = posisi.kend;
		const data = {
			x: +posisi.x.toFixed(2),
			y: +(posisi.yTampil ?? posisi.y).toFixed(2),
			z: +posisi.z.toFixed(2),
			rot: +posisi.rot.toFixed(2),
			pose: posisi.pose || "jalan",
			udara: !!posisi.udara,
			lari: !!posisi.lari,
			kend: k
				? { id: k.id, x: +k.x.toFixed(2), z: +k.z.toFixed(2), rot: +k.rot.toFixed(2), laju: +k.laju.toFixed(2), setir: +k.setir.toFixed(2), pintu: +k.pintu.toFixed(2), miring: +k.miring.toFixed(2) }
				: undefined,
		};
		const kunci = JSON.stringify(data);
		if (kunci === terakhir) return;
		terakhir = kunci;
		s.volatile.emit("gerak", data);
	}, JEDA_KIRIM);
	s.on("connect", () => (terakhir = ""));

	// Lepas kursi saat tab disembunyikan cukup lama; sambung lagi saat kembali.
	lepasTersembunyi = () => {
		clearTimeout(lepasTersembunyi.t);
		if (document.visibilityState === "hidden") lepasTersembunyi.t = setTimeout(() => s.disconnect(), LEPAS_SAAT_TERSEMBUNYI_MS);
		else if (!s.connected) s.connect();
	};
	document.addEventListener("visibilitychange", lepasTersembunyi);
}

export function putusJelajah() {
	generasi++;
	if (!socket) {
		if (ringkas.status !== "mati") ubah({ status: "mati", id: null, daftar: [], sapaan: null });
		return;
	}
	clearInterval(pengirim);
	pengirim = null;
	if (lepasTersembunyi) {
		clearTimeout(lepasTersembunyi.t);
		document.removeEventListener("visibilitychange", lepasTersembunyi);
		lepasTersembunyi = null;
	}
	socket.removeAllListeners();
	socket.disconnect();
	socket = null;
	pemainLain.clear();
	diriSendiri.ucap = null;
	diriSendiri.emote = null;
	ubah({ status: "mati", id: null, daftar: [], sapaan: null });
}

export function kirimUcap(teks) {
	const t = String(teks || "").trim().slice(0, 120);
	if (t && socket?.connected) socket.emit("ucap", { teks: t });
}
export const kirimEmote = (jenis) => socket?.connected && socket.emit("emote", { jenis });
export const sapaPemain = (id) => socket?.connected && socket.emit("sapa", { ke: id });
export const tutupSapaan = () => ubah({ sapaan: null });
