import { useSyncExternalStore } from "react";
import { asalSocket } from "../../utils/asalServer";
import { posisi } from "./jelajahStore";
import { FASE_PANCING, pancing } from "./pancing";
import { kendaraanDariId } from "./scene/kendaraan";
import { klakson } from "./suaraPancing";
import { bersihkanGaya, lemari } from "./lemari";
import { belanja } from "./belanja";
import { ambilKoleksi, bayarKoin, dengarKoleksi, tambahKoin } from "./pancing";
import { ubahTenaga } from "./tenaga";
import { dengarProgres, hariIni, levelDari, progres } from "./progres";
import { dengarBangun, skorBangun, totalPesanan } from "./bangunWilayah";
import { tanda } from "./tandaJelajah";

// Jelajah bersama: setiap tamu yang membuka /jelajah tersambung ke namespace
// socket.io "/jelajah" (lihat dpmd-fahri-express/src/socket/jelajah.socket.js).
// Posisi pemain lain disimpan di Map mutable yang dibaca tiap frame oleh
// PemainLain; hanya hal yang jarang berubah (daftar pemain, obrolan, sapaan)
// yang memicu render React.

const JEDA_KIRIM = 100;
const LAMA_UCAP = 7000;
const LAMA_EMOTE = 2600;
const MAKS_OBROLAN = 40;
// Tab yang ditinggal lebih lama dari ini melepas kursinya (tiap ruang maks. 10 tamu).
const LEPAS_SAAT_TERSEMBUNYI_MS = 2 * 60 * 1000;

// id → { profil, s: keadaan terakhir dari server, jejak: [{t,x,y,z,rot}] untuk interpolasi, ucap, emote }
export const pemainLain = new Map();
// Balon chat & emote milik pemain sendiri, digambar di atas kepalanya.
export const diriSendiri = { ucap: null, emote: null };

let ringkas = { status: "mati", id: null, ruang: null, daftar: [], obrolan: [], sapaan: null, galat: null, gotong: null };
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

// Identitas anonim perangkat ini, dipakai server untuk moderasi (bisu/lapor); bukan akun.
function kunciPemain() {
	const KUNCI = "jelajah-kunci-pemain-v1";
	try {
		const ada = localStorage.getItem(KUNCI);
		if (ada && /^[a-z0-9]{16,40}$/.test(ada)) return ada;
	} catch {
		/* penyimpanan tidak tersedia */
	}
	const b = crypto.getRandomValues(new Uint8Array(12));
	const baru = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
	try {
		localStorage.setItem(KUNCI, baru);
	} catch {
		/* tetap pakai nilai di memori */
	}
	return baru;
}
const kunciSesi = kunciPemain();

// Bisu sisi klien: bertahan selama halaman terbuka, walau tersambung ulang.
const dibisukan = new Set();
export function bisukanPemain(nama) {
	const n = String(nama).toLowerCase();
	if (!dibisukan.delete(n)) dibisukan.add(n);
}
export const sudahDibisukan = (nama) => dibisukan.has(String(nama).toLowerCase());
const dilaporkan = new Set();
export function laporkanPemain(id) {
	if (!socket?.connected || dilaporkan.has(id)) return false;
	dilaporkan.add(id);
	socket.emit("lapor", { ke: id });
	return true;
}
export const sudahDilaporkan = (id) => dilaporkan.has(id);

// ---------- Gotong royong se-kabupaten ----------
// Pesanan kabupaten yang kita selesaikan ikut dihitung server; bonus diklaim sekali sehari.
const KUNCI_GOTONG = "jelajah-gotong-v1";
const bacaGotong = () => {
	try {
		return JSON.parse(localStorage.getItem(KUNCI_GOTONG)) || {};
	} catch {
		return {};
	}
};
const simpanGotong = (d) => {
	try {
		localStorage.setItem(KUNCI_GOTONG, JSON.stringify(d));
	} catch {
		/* penyimpanan tidak tersedia */
	}
};
function terimaGotong(g) {
	ubah({ gotong: g });
	const d = bacaGotong();
	if (!g || g.jumlah < g.target || d.tanggal !== g.tanggal || !d.ikut || d.klaim) return;
	simpanGotong({ ...d, klaim: true });
	tambahKoin(150);
	ubahTenaga(0, { teks: "🤝 Gotong royong tercapai! Bonus 🪙 150", jenis: "baik" });
}
let totalTerakhir = totalPesanan();
function pantauBangun() {
	kirimSkor();
	const n = totalPesanan();
	if (n > totalTerakhir) {
		const tanggal = ringkas.gotong?.tanggal ?? hariIni();
		const d = bacaGotong();
		simpanGotong(d.tanggal === tanggal ? { ...d, ikut: true } : { tanggal, ikut: true, klaim: false });
		if (socket?.connected) socket.emit("gotong");
	}
	totalTerakhir = n;
}

const daftarDariMap = () => [...pemainLain.entries()].map(([id, p]) => ({ id, ...p.profil }));

function tambahObrolan(m) {
	ubah({ obrolan: [...ringkas.obrolan, m].slice(-MAKS_OBROLAN) });
}

// ---------- Lomba Galatama bersama (Kolam Monster) ----------
// Keadaan lombanya dikelola kolamMonster.js; modul ini hanya meneruskan pesan server.
let kaitLomba = null;
let lombaDiumumkan = null;
const antreIkanLomba = [];
export const aturKaitLomba = (f) => (kaitLomba = f);
// sedang dalam mode jelajah bersama (walau koneksinya sesaat terputus)
export const modeBersama = () => !!socket;
export const kirimLomba = (acara, data) =>
	new Promise((ok) => {
		if (!socket?.connected) return ok({ ok: false, alasan: "Belum tersambung ke jelajah bersama — coba lagi sebentar" });
		socket.timeout(8000).emit(acara, data, (err, r) => ok(err || !r ? { ok: false, alasan: "Server tidak menjawab — coba lagi" } : r));
	});
// tangkapan saat lomba: bila koneksi sedang putus, dikirim begitu tersambung lagi
export function kirimIkanLomba(data) {
	if (socket?.connected) socket.emit("lomba:ikan", data);
	else antreIkanLomba.push(data);
}
// ---------- Lomba Basket antar-tamu (Taman Warga) ----------
// Keadaan lagannya dikelola basket.js; modul ini hanya meneruskan pesan server.
let kaitBasket = null;
export const aturKaitBasket = (f) => (kaitBasket = f);
export const kirimBasket = (acara, data) => socket?.connected && socket.emit(acara, data);
export const idSocket = () => socket?.id ?? null;
export const pesanSistem = (teks) => tambahObrolan({ sistem: true, teks, waktu: Date.now() });

function terimaLomba(m) {
	if (m?.fase === "daftar" && m.id !== lombaDiumumkan) {
		lombaDiumumkan = m.id;
		tambahObrolan({ sistem: true, teks: `🏆 Lomba Galatama dibuka di Kolam Monster — daftar di loket (${Math.ceil(m.sisa / 1000)} dtk lagi)`, waktu: Date.now() });
	}
	kaitLomba?.(m ?? null);
}

// Kendaraan yang sedang dikemudikan tamu lain tidak bisa dinaiki.
export function kendaraanDipakaiLain(id) {
	for (const p of pemainLain.values()) if (p.s?.kend?.id === id) return true;
	return false;
}

// Pancingan sendiri untuk tamu lain: fase, titik pelampung/ikan, arah bidik, tegangan,
// dan jenis ikan (saat melawan & setelah tertangkap).
function dataPancing() {
	const p = pancing;
	if (!p.aktif) return undefined;
	const adaIkan = p.fase === "tarik" || p.fase === "dapat";
	const titik = adaIkan ? p.ikanPos : p.pelampung;
	const ikan = p.fase === "dapat" ? p.hasil?.ikan : p.ikan;
	return {
		f: FASE_PANCING.indexOf(p.fase),
		x: +titik.x.toFixed(2),
		z: +titik.z.toFixed(2),
		y: +(p.fase === "lempar" ? p.pelampung.y : 0).toFixed(2),
		a: +(p.asal.rot + p.aim).toFixed(2),
		t: +Math.min(2, p.tegang).toFixed(2),
		...(adaIkan && ikan ? { i: ikan.id, kg: p.fase === "dapat" ? p.hasil.kg : p.kg } : {}),
	};
}

// Kursi kendaraan yang sedang diduduki tamu lain (0 = pengemudi).
export function kursiTerpakai(id) {
	const hasil = new Set();
	for (const p of pemainLain.values()) if (p.s?.kend?.id === id) hasil.add(p.s.kend.kursi ?? 0);
	return hasil;
}

let socket = null;
// Kecamatan tempat pemain kini (null = kantor) & penyusun data gerak dunia itu.
let duniaKec = null;
let gerakDunia = null;
export function pindahDunia(kec, ambilGerak = null) {
	duniaKec = kec;
	if (kec) tanda("kecamatan");
	gerakDunia = ambilGerak;
	pemainLain.clear();
	ubah({ daftar: [] });
	if (socket?.connected) socket.emit("pindah", { kec });
}
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
		auth: { nama: profil.nama, jk: profil.jk, avatar: profil.avatar, kulit: profil.kulit, gaya: lemari.pakai, kunci: kunciSesi },
		transports: ["polling", "websocket"],
		reconnectionDelayMax: 8000,
	});
	const s = socket;

	s.on("connect_error", (e) => {
		const pesan =
			e?.message === "penuh"
				? "Jelajah bersama sedang penuh (maks. 60 tamu). Anda tetap bisa menjelajah sendiri."
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
	let tolakDiumumkan = false;
	s.on("selamat", (m) => {
		pemainLain.clear();
		for (const p of m.pemain || []) pemainLain.set(p.id, { profil: { nama: p.nama, jk: p.jk, avatar: p.avatar, kulit: p.kulit, gaya: bersihkanGaya(p.gaya) }, s: p.s });
		// Mobil & motor yang sudah dipindahkan tamu lain sebelum kita masuk.
		for (const [id, k] of Object.entries(m.kendaraan || {})) {
			const kend = kendaraanDariId(id, k);
			if (kend && posisi.kend !== kend) Object.assign(kend, { x: k.x, z: k.z, rot: k.rot });
		}
		ubah({ status: "tersambung", id: m.id, ruang: m.ruang ?? null, daftar: daftarDariMap(), galat: null });
		terimaLomba(m.lomba);
		kaitBasket?.(m.basket ?? null);
		terimaGotong(m.gotong ?? null);
		tanda("bersama");
		if (m.namaDitolak && !tolakDiumumkan) {
			tolakDiumumkan = true;
			tambahObrolan({ sistem: true, teks: "Nama itu tidak bisa dipakai di mode bersama, jadi Anda tampil sebagai Tamu.", waktu: Date.now() });
		}
		while (antreIkanLomba.length) s.emit("lomba:ikan", antreIkanLomba.shift());
		kirimSkor();
		if (!lepasSkor) {
			const a = dengarProgres(kirimSkor);
			const b = dengarKoleksi(kirimSkor);
			const c = dengarBangun(pantauBangun);
			lepasSkor = () => (a(), b(), c());
		}
	});
	s.on("lomba", terimaLomba);
	s.on("basket", (m) => kaitBasket?.(m));
	s.on("gotong", terimaGotong);
	s.on("masuk", (p) => {
		pemainLain.set(p.id, { profil: { nama: p.nama, jk: p.jk, avatar: p.avatar, kulit: p.kulit, gaya: bersihkanGaya(p.gaya) }, s: p.s });
		ubah({ daftar: daftarDariMap() });
		tambahObrolan({ sistem: true, teks: duniaKec ? `👋 ${p.nama} tiba di ${duniaKec}` : `${p.nama} masuk ke kantor`, waktu: Date.now() });
	});
	s.on("keluar", ({ id }) => {
		const p = pemainLain.get(id);
		if (!p) return;
		pemainLain.delete(id);
		ubah({ daftar: daftarDariMap() });
		tambahObrolan({ sistem: true, teks: `${p.profil.nama} meninggalkan ${duniaKec || "kantor"}`, waktu: Date.now() });
	});
	s.on("posisi", (daftar) => {
		const kini = performance.now();
		for (const { id, s: st } of daftar) {
			const p = pemainLain.get(id);
			if (!p) continue;
			p.s = st;
			// riwayat singkat untuk diputar sedikit di belakang waktu nyata (lihat PemainLain)
			const j = (p.jejak ||= []);
			j.push({ t: kini, x: st.x, y: st.y, z: st.z, rot: st.rot });
			if (j.length > 12) j.shift();
		}
	});
	s.on("ucap", (m) => {
		if (m.id !== s.id && sudahDibisukan(m.nama)) return;
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
	// klakson tamu lain: makin jauh makin pelan, tak terdengar lewat 70 m
	s.on("klakson", (m) => {
		const st = pemainLain.get(m.id)?.s;
		if (!st || (st.pose !== "mobil" && st.pose !== "motor")) return;
		klakson(st.pose, 1 - Math.hypot(st.x - posisi.x, st.z - posisi.z) / 70);
	});
	// tamu lain berganti topi/baju/celana/sepatu
	s.on("gaya", (m) => {
		const p = pemainLain.get(m.id);
		if (!p) return;
		p.profil = { ...p.profil, gaya: bersihkanGaya(m.gaya) };
		ubah({ daftar: daftarDariMap() });
	});
	s.on("hadiah", (m) => {
		const n = [10, 20, 50].includes(m?.n) ? m.n : 0;
		if (!n) return;
		tambahKoin(n);
		ubahTenaga(0, { teks: `🎁 ${m.nama || "Tamu"} memberi Anda 🪙 ${n} koin!`, jenis: "baik" });
	});
	s.on("disapa", (m) => !sudahDibisukan(m.nama) && ubah({ sapaan: { ...m, waktu: Date.now() } }));
	s.on("ditolak", (m) => tambahObrolan({ sistem: true, teks: m.alasan, waktu: Date.now() }));

	// Kirim posisi sendiri ±10x per detik, hanya bila berubah.
	let terakhir = "";
	pengirim = setInterval(() => {
		if (!s.connected) return;
		const k = posisi.kend;
		const data = gerakDunia ? gerakDunia() : {
			x: +posisi.x.toFixed(2),
			y: +(posisi.yTampil ?? posisi.y).toFixed(2),
			z: +posisi.z.toFixed(2),
			rot: +posisi.rot.toFixed(2),
			pose: posisi.pose || "jalan",
			udara: !!posisi.udara,
			lari: !!posisi.lari,
			pu: posisi.pose === "panjat" ? +posisi.panjatU.toFixed(2) : undefined,
			pt: posisi.pose === "panjat" ? posisi.panjatT : undefined,
			kend: k
				? { id: k.id, x: +k.x.toFixed(2), z: +k.z.toFixed(2), rot: +k.rot.toFixed(2), laju: +k.laju.toFixed(2), setir: +k.setir.toFixed(2), pintu: +k.pintu.toFixed(2), miring: +k.miring.toFixed(2), h: +(k.h || 0).toFixed(2), kursi: posisi.kursi ?? 0 }
				: undefined,
			pc: dataPancing(),
			kr: belanja.bawaKeranjang ? belanja.keranjang.slice(0, 12) : undefined,
			ak: posisi.aktivitas || undefined,
		};
		const kunci = JSON.stringify(data);
		if (kunci === terakhir) return;
		terakhir = kunci;
		s.volatile.emit("gerak", data);
	}, JEDA_KIRIM);
	s.on("connect", () => {
		terakhir = "";
		// tersambung ulang selalu mulai di kantor: kembali ke kecamatan semula
		if (duniaKec) s.emit("pindah", { kec: duniaKec });
	});

	// Lepas kursi saat tab disembunyikan cukup lama; sambung lagi saat kembali.
	lepasTersembunyi = () => {
		clearTimeout(lepasTersembunyi.t);
		if (document.visibilityState === "hidden") lepasTersembunyi.t = setTimeout(() => s.disconnect(), LEPAS_SAAT_TERSEMBUNYI_MS);
		else if (!s.connected) s.connect();
	};
	document.addEventListener("visibilitychange", lepasTersembunyi);
}

// ---------- papan peringkat ----------
// Catatan tamu dikirim saat tersambung dan tiap kali level / koleksi / rekor berubah
// (diredam 3 detik).
function dataSkor() {
	const { koleksi } = ambilKoleksi();
	let ikan = null;
	let kg = 0;
	for (const [id, c] of Object.entries(koleksi)) if (c.terberat > kg) [ikan, kg] = [id, c.terberat];
	return { level: levelDari(progres.xp), xp: progres.xp, ikan, kg, jenis: Object.keys(koleksi).length, ...skorBangun() };
}
let tundaSkor = null;
const kirimSkor = () => {
	clearTimeout(tundaSkor);
	tundaSkor = setTimeout(() => socket?.connected && socket.emit("skor", dataSkor()), 3000);
};
let lepasSkor = null;
export const mintaPeringkat = () =>
	new Promise((ok, gagal) => {
		if (!socket?.connected) return gagal(new Error("tidak tersambung"));
		socket.timeout(8000).emit("peringkat", null, (err, data) => (err ? gagal(err) : ok(data)));
	});

export function putusJelajah() {
	generasi++;
	lepasSkor?.();
	lepasSkor = null;
	if (!socket) {
		if (ringkas.status !== "mati") ubah({ status: "mati", id: null, ruang: null, daftar: [], sapaan: null });
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
	antreIkanLomba.length = 0;
	kaitLomba?.(undefined); // keluar dari mode bersama
	kaitBasket?.(null);
	pemainLain.clear();
	diriSendiri.ucap = null;
	diriSendiri.emote = null;
	ubah({ status: "mati", id: null, ruang: null, daftar: [], sapaan: null });
}

export function kirimUcap(teks) {
	const t = String(teks || "").trim().slice(0, 120);
	if (!t || !socket?.connected) return false;
	socket.emit("ucap", { teks: t });
	return true;
}
export const kirimEmote = (jenis) => socket?.connected && socket.emit("emote", { jenis });
export const kirimKlakson = () => socket?.connected && socket.emit("klakson");
export const kirimGaya = (gaya) => socket?.connected && socket.emit("gaya", gaya);
export const sapaPemain = (id) => socket?.connected && socket.emit("sapa", { ke: id });
// Beri koin ke tamu lain: koin sendiri dipotong dulu, lalu diteruskan server.
export function beriHadiah(id, n) {
	if (!socket?.connected) return "Tidak tersambung";
	if (!bayarKoin(n)) return "Koin belum cukup";
	socket.emit("hadiah", { ke: id, n });
	return null;
}
export const tutupSapaan = () => ubah({ sapaan: null });
