import { useEffect, useState, useSyncExternalStore } from "react";
import { IKAN_PER_ID, ambilKoleksi, aturKaitKolam, bayarKoin, pilihIkanKolam, tambahKoin } from "./pancing";
import { catat, tambahXp } from "./progres";
import { ubahTenaga } from "./tenaga";
import { aturKaitLomba, kirimIkanLomba, kirimLomba, modeBersama } from "./multipemain";

// Kolam Monster DPMD: kolam pemancingan berbayar di samping kantor. Isinya hanya ikan
// Monster & Legenda (lihat pilihIkanKolam di pancing.js).
//
//   Tiket bebas — 2.000 koin untuk 10 menit memancing.
//   Lomba GALATAMA — format lomba kolam pemancingan di Indonesia: peserta membayar
//   tiket, satu sesi berwaktu, juara ditentukan IKAN TERBERAT (babon); bila sama,
//   total berat yang menentukan. Hadiah koin untuk juara 1–3.
//
// Dua cara berlomba:
//   - jelajah BERSAMA: satu lomba untuk semua tamu yang terhubung, dikelola server
//     (dpmd-fahri-express/src/socket/jelajahLomba.js) — pendaftaran 30 dtk lalu sesi
//     5 menit; bila hanya satu tamu yang daftar, lawannya pemancing tetap kolam.
//   - jelajah SENDIRI: lomba di perangkat melawan 5 pemancing tetap kolam.
//
// Tiket, lomba sendiri, keikutsertaan lomba bersama, dan rekor disimpan di perangkat.

export const TIKET = { harga: 2000, menit: 10 };
export const LOMBA = { biaya: 500, menit: 5, hadiah: [3000, 1500, 750] };

const LAWAN = [
	{ id: "darto", nama: "Pak Darto", ikon: "🧔", mahir: 1.05, laju: 48 },
	{ id: "euis", nama: "Teh Euis", ikon: "👩", mahir: 0.95, laju: 55 },
	{ id: "asep", nama: "Kang Asep", ikon: "🧢", mahir: 1.0, laju: 42 },
	{ id: "ujang", nama: "Mang Ujang", ikon: "👴", mahir: 1.12, laju: 70 },
	{ id: "rina", nama: "Rina", ikon: "👧", mahir: 0.88, laju: 50 },
];

const REKOR_KOSONG = { lomba: 0, juara: 0, podium: 0, babon: 0, babonIkan: null, terbaik: null };
const KUNCI = "jelajah-kolam-monster-v1";
const baca = () => {
	try {
		const d = JSON.parse(localStorage.getItem(KUNCI));
		if (d && typeof d === "object") return { tiketSampai: d.tiketSampai || 0, lomba: d.lomba || null, rekor: d.rekor || { ...REKOR_KOSONG }, ikut: d.ikut || null, hasilBersama: d.hasilBersama || null };
	} catch {
		/* penyimpanan tidak tersedia */
	}
	return { tiketSampai: 0, lomba: null, rekor: { ...REKOR_KOSONG }, ikut: null, hasilBersama: null };
};
let st = baca();
// lomba bersama terakhir dari server (tidak disimpan): { id, fase, sampai, peserta, kabar }
let bersama = null;
const pendengar = new Set();
function simpan() {
	try {
		localStorage.setItem(KUNCI, JSON.stringify(st));
	} catch {
		/* abaikan */
	}
	st = { ...st };
	pendengar.forEach((f) => f());
}
export const useKolam = () =>
	useSyncExternalStore(
		(f) => (pendengar.add(f), () => pendengar.delete(f)),
		() => st,
	);
export const ambilKolam = () => st;
// jam dinding untuk hitung mundur di panel & HUD
export function useDetik() {
	const [kini, setKini] = useState(Date.now);
	useEffect(() => {
		const t = setInterval(() => setKini(Date.now()), 1000);
		return () => clearInterval(t);
	}, []);
	return kini;
}

// ---------- tiket ----------

const ikutBersama = () => !!bersama && st.ikut?.id === bersama.id;
const lombaLokalBerjalan = (kini) => !!st.lomba && !st.lomba.hasil && kini < st.lomba.selesai;
export const tiketAktif = (kini = Date.now()) => st.tiketSampai > kini;
export const lombaBerjalan = (kini = Date.now()) => lombaLokalBerjalan(kini) || (ikutBersama() && bersama.fase === "jalan" && kini < bersama.sampai);
export const aksesKolam = (kini = Date.now()) => tiketAktif(kini) || lombaBerjalan(kini);

// Beli (atau perpanjang) tiket. Mengembalikan pesan galat, atau null bila berhasil.
export function beliTiket() {
	if (!bayarKoin(TIKET.harga)) return `Koin belum cukup — tiket Kolam Monster 🪙 ${TIKET.harga}`;
	st.tiketSampai = Math.max(Date.now(), st.tiketSampai) + TIKET.menit * 60000;
	simpan();
	return null;
}

// ---------- lomba galatama ----------

const sampelLawan = (l) => {
	// jeda antar-tangkapan: sebaran eksponensial di sekitar laju (detik)
	const jeda = -Math.log(1 - Math.random()) * l.laju * 1000;
	return Math.max(15000, jeda);
};
const acakKunci = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");

// Daftar lomba (bersama bila sedang jelajah bersama). Mengembalikan pesan galat atau null.
export async function daftarLomba() {
	if (lombaLokalBerjalan(Date.now())) return "Lomba sedang berlangsung";
	if (ambilKoleksi().poin < LOMBA.biaya) return `Koin belum cukup — biaya lomba 🪙 ${LOMBA.biaya}`;
	if (modeBersama()) {
		if (ikutBersama() && bersama.fase !== "selesai") return "Kamu sudah terdaftar di lomba ini";
		const kunci = acakKunci();
		const r = await kirimLomba("lomba:daftar", { kunci });
		if (!r.ok) return r.alasan || "Gagal mendaftar lomba";
		// biaya dipotong setelah server menerima pendaftaran
		bayarKoin(LOMBA.biaya);
		st.ikut = { id: r.id, pid: r.pid, kunci, dibayar: false };
		st.hasilBersama = null;
		st.lomba = null;
		simpan();
		return null;
	}
	if (!bayarKoin(LOMBA.biaya)) return `Koin belum cukup — biaya lomba 🪙 ${LOMBA.biaya}`;
	const mulai = Date.now();
	st.lomba = {
		mulai,
		selesai: mulai + LOMBA.menit * 60000,
		peserta: [
			{ id: "saya", nama: "Kamu", ikon: "🎣", saya: true, ikan: 0, total: 0, babon: 0, babonIkan: null },
			...LAWAN.map((l) => ({ ...l, ikan: 0, total: 0, babon: 0, babonIkan: null, berikut: mulai + sampelLawan(l) })),
		],
		hasil: null,
		kabar: [],
	};
	simpan();
	jalankanJam();
	return null;
}

const catatTangkapan = (p, ikan, kg) => {
	p.ikan += 1;
	p.total = Math.round((p.total + kg) * 100) / 100;
	if (kg > p.babon) {
		p.babon = kg;
		p.babonIkan = ikan.id;
	}
};

// urutan galatama: babon terberat, lalu total berat
export const urutkan = (peserta) => [...peserta].sort((a, b) => b.babon - a.babon || b.total - a.total);

function kabar(teks) {
	const l = st.lomba;
	l.kabar = [{ teks, id: Date.now() + Math.random() }, ...(l.kabar || [])].slice(0, 4);
}

function majukanLawan(kini) {
	const l = st.lomba;
	let berubah = false;
	for (const p of l.peserta) {
		if (p.saya) continue;
		let aman = 0;
		while (p.berikut <= Math.min(kini, l.selesai) && aman++ < 20) {
			const { ikan, kg } = pilihIkanKolam(1 + (p.mahir - 1) * 3);
			const kgLawan = Math.round(Math.min(ikan.kg[1], kg * p.mahir) * 100) / 100;
			catatTangkapan(p, ikan, kgLawan);
			if (p.babon === kgLawan) kabar(`${p.ikon} ${p.nama} dapat ${ikan.nama} ${kgLawan.toLocaleString("id-ID")} kg`);
			p.berikut += sampelLawan(p);
			berubah = true;
		}
	}
	return berubah;
}

// Hadiah, rekor, misi & XP dari urutan akhir (lomba sendiri maupun bersama).
function berikanHasil(urut) {
	const peringkat = urut.findIndex((p) => p.saya) + 1;
	const saya = urut[peringkat - 1];
	// tanpa tangkapan tidak ada hadiah, sekalipun peserta lain juga kosong; peringkat terakhir
	// juga tidak, supaya lomba 2–3 tamu tanpa NPC tidak menjamin koin bagi yang kalah
	const hadiah = saya.ikan > 0 && peringkat < urut.length ? LOMBA.hadiah[peringkat - 1] || 0 : 0;
	if (hadiah) tambahKoin(hadiah);
	const r = st.rekor;
	r.lomba += 1;
	catat("lomba");
	if (peringkat === 1 && saya.ikan > 0) r.juara += 1;
	if (peringkat <= 3 && saya.ikan > 0) r.podium += 1;
	if (saya.babon > r.babon) {
		r.babon = saya.babon;
		r.babonIkan = saya.babonIkan;
	}
	if (saya.ikan > 0 && (!r.terbaik || peringkat < r.terbaik)) r.terbaik = peringkat;
	if (peringkat === 1 && saya.ikan > 0) {
		catat("juaraLomba");
		tambahXp(400);
	} else tambahXp(80);
	return { peringkat, hadiah, urut: urut.map(({ id, nama, ikon, saya: s, ikan, total, babon, babonIkan }) => ({ id, nama, ikon, saya: !!s, ikan, total, babon, babonIkan })) };
}

let jam = null;
function detak() {
	const l = st.lomba;
	if (!l || l.hasil) {
		clearInterval(jam);
		jam = null;
		return;
	}
	const kini = Date.now();
	const berubah = majukanLawan(kini);
	if (kini >= l.selesai) l.hasil = berikanHasil(urutkan(l.peserta));
	if (berubah || l.hasil) simpan();
}
function jalankanJam() {
	if (jam) return;
	jam = setInterval(detak, 1000);
	detak();
}
// lomba yang belum tuntas saat halaman dibuka dilanjutkan (lawan "menyusul" waktunya)
if (st.lomba && !st.lomba.hasil) jalankanJam();

export function tutupHasilLomba() {
	if (st.lomba?.hasil) st.lomba = null;
	st.hasilBersama = null;
	simpan();
}

// ---------- lomba bersama (pesan dari server) ----------

const pesertaBersama = () => bersama.peserta.map((p) => ({ ...p, id: p.pid, saya: ikutBersama() && p.pid === st.ikut.pid }));

aturKaitLomba((m) => {
	if (m === undefined || m === null) {
		// keluar dari jelajah bersama, atau tidak ada lomba di server
		bersama = null;
		simpan();
		return;
	}
	bersama = { ...m, sampai: Date.now() + m.sisa };
	if (m.fase === "selesai" && st.ikut?.id === m.id && !st.ikut.dibayar) {
		st.ikut.dibayar = true;
		st.hasilBersama = berikanHasil(urutkan(pesertaBersama()));
	}
	if (m.fase === "jalan" && ikutBersama() && !st.ikut.diumumkan) {
		st.ikut.diumumkan = true;
		ubahTenaga(0, { teks: "🏆 Lomba Galatama dimulai! Pancing ikan terberat dalam 5 menit", jenis: "baik" });
	}
	simpan();
});

// Ringkasan lomba untuk panel & HUD (sendiri atau bersama), atau null.
export function lombaKini() {
	if (st.lomba) {
		const l = st.lomba;
		return { bersama: false, fase: l.hasil ? "selesai" : "jalan", sampai: l.selesai, ikut: true, peserta: urutkan(l.peserta), kabar: l.kabar || [], hasil: l.hasil };
	}
	if (bersama) {
		const peserta = urutkan(pesertaBersama());
		const nama = new Map(peserta.map((p) => [p.pid, p]));
		const kabarTeks = (bersama.kabar || []).map((k) => ({ id: `${k.pid}:${k.t}`, teks: `${nama.get(k.pid)?.ikon ?? "🎣"} ${nama.get(k.pid)?.nama ?? "Peserta"} dapat ${namaIkan(k.i)} ${k.kg.toLocaleString("id-ID")} kg` }));
		return { bersama: true, fase: bersama.fase, sampai: bersama.sampai, ikut: ikutBersama(), peserta, kabar: kabarTeks, hasil: ikutBersama() ? st.hasilBersama : null };
	}
	if (st.hasilBersama) return { bersama: true, fase: "selesai", sampai: 0, ikut: true, peserta: st.hasilBersama.urut, kabar: [], hasil: st.hasilBersama };
	return null;
}

// ---------- sambungan ke mesin memancing ----------
aturKaitKolam({
	aksesKolam,
	lombaBerjalan,
	saatHabis: () => ubahTenaga(0, { teks: "⏰ Waktu di Kolam Monster habis — beli tiket lagi di loket", jenis: "buruk" }),
	// tangkapan saat lomba: dicatat, dikembalikan ringkasan untuk kartu hasil
	saatDapat: (ikan, kg) => {
		if (!lombaBerjalan()) return null;
		if (lombaLokalBerjalan(Date.now())) {
			const l = st.lomba;
			const saya = l.peserta.find((p) => p.saya);
			const babonLama = saya.babon;
			catatTangkapan(saya, ikan, kg);
			const peringkat = urutkan(l.peserta).findIndex((p) => p.saya) + 1;
			if (kg > babonLama) kabar(`🎣 Kamu dapat ${ikan.nama} ${kg.toLocaleString("id-ID")} kg — babon baru!`);
			simpan();
			return { peringkat, babonBaru: kg > babonLama, total: saya.total };
		}
		// lomba bersama: kirim ke server, tampilkan perkiraan peringkat sementara
		kirimIkanLomba({ kunci: st.ikut.kunci, i: ikan.id, kg });
		const saya = bersama.peserta.find((p) => p.pid === st.ikut.pid);
		if (!saya) return null;
		const babonLama = saya.babon;
		catatTangkapan(saya, ikan, kg);
		const peringkat = urutkan(pesertaBersama()).findIndex((p) => p.saya) + 1;
		simpan();
		return { peringkat, babonBaru: kg > babonLama, total: saya.total };
	},
});

export const namaIkan = (id) => IKAN_PER_ID[id]?.nama || "—";
