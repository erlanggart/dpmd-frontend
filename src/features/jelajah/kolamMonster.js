import { useEffect, useState, useSyncExternalStore } from "react";
import { IKAN_PER_ID, aturKaitKolam, bayarKoin, pilihIkanKolam, tambahKoin } from "./pancing";
import { catat, tambahXp } from "./progres";
import { ubahTenaga } from "./tenaga";

// Kolam Monster DPMD: kolam pemancingan berbayar di samping kantor. Isinya hanya ikan
// Monster & Legenda (lihat pilihIkanKolam di pancing.js).
//
//   Tiket bebas — 500 koin untuk 10 menit memancing.
//   Lomba GALATAMA — format lomba kolam pemancingan di Indonesia: peserta membayar
//   tiket, satu sesi berwaktu, juara ditentukan IKAN TERBERAT (babon); bila sama,
//   total berat yang menentukan. Lawannya pemancing tetap kolam dengan kemahiran
//   berbeda. Hadiah koin untuk juara 1–3.
//
// Semua keadaan disimpan di perangkat supaya tiket & lomba tetap berjalan bila
// halaman dimuat ulang.

export const TIKET = { harga: 500, menit: 10 };
export const LOMBA = { biaya: 500, menit: 5, hadiah: [3000, 1500, 750] };

const LAWAN = [
	{ id: "darto", nama: "Pak Darto", ikon: "🧔", mahir: 1.05, laju: 48 },
	{ id: "euis", nama: "Teh Euis", ikon: "👩", mahir: 0.95, laju: 55 },
	{ id: "asep", nama: "Kang Asep", ikon: "🧢", mahir: 1.0, laju: 42 },
	{ id: "ujang", nama: "Mang Ujang", ikon: "👴", mahir: 1.12, laju: 70 },
	{ id: "rina", nama: "Rina", ikon: "👧", mahir: 0.88, laju: 50 },
];

const KUNCI = "jelajah-kolam-monster-v1";
const baca = () => {
	try {
		const d = JSON.parse(localStorage.getItem(KUNCI));
		if (d && typeof d === "object") return { tiketSampai: d.tiketSampai || 0, lomba: d.lomba || null, rekor: d.rekor || { lomba: 0, juara: 0, podium: 0, babon: 0, babonIkan: null, terbaik: null } };
	} catch {
		/* penyimpanan tidak tersedia */
	}
	return { tiketSampai: 0, lomba: null, rekor: { lomba: 0, juara: 0, podium: 0, babon: 0, babonIkan: null, terbaik: null } };
};
let st = baca();
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

export const tiketAktif = (kini = Date.now()) => st.tiketSampai > kini;
export const lombaBerjalan = (kini = Date.now()) => !!st.lomba && !st.lomba.hasil && kini < st.lomba.selesai;
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

export function daftarLomba() {
	if (lombaBerjalan()) return "Lomba sedang berlangsung";
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

function selesaikan() {
	const l = st.lomba;
	const urut = urutkan(l.peserta);
	const peringkat = urut.findIndex((p) => p.saya) + 1;
	const saya = urut[peringkat - 1];
	// tanpa tangkapan tidak ada hadiah, sekalipun peserta lain juga kosong
	const hadiah = saya.ikan > 0 ? LOMBA.hadiah[peringkat - 1] || 0 : 0;
	if (hadiah) tambahKoin(hadiah);
	l.hasil = { peringkat, hadiah, urut: urut.map(({ id, nama, ikon, saya: s, ikan, total, babon, babonIkan }) => ({ id, nama, ikon, saya: !!s, ikan, total, babon, babonIkan })) };
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
	if (kini >= l.selesai) selesaikan();
	if (berubah || l.hasil) simpan();
	else pendengar.forEach((f) => f()); // hitung mundur di HUD
}
function jalankanJam() {
	if (jam) return;
	jam = setInterval(detak, 1000);
	detak();
}
// lomba yang belum tuntas saat halaman dibuka dilanjutkan (lawan "menyusul" waktunya)
if (st.lomba && !st.lomba.hasil) jalankanJam();

export function tutupHasilLomba() {
	if (st.lomba?.hasil) {
		st.lomba = null;
		simpan();
	}
}

// ---------- sambungan ke mesin memancing ----------
aturKaitKolam({
	aksesKolam,
	lombaBerjalan,
	saatHabis: () => ubahTenaga(0, { teks: "⏰ Waktu di Kolam Monster habis — beli tiket lagi di loket", jenis: "buruk" }),
	// tangkapan saat lomba: dicatat, dikembalikan ringkasan untuk kartu hasil
	saatDapat: (ikan, kg) => {
		if (!lombaBerjalan()) return null;
		const l = st.lomba;
		const saya = l.peserta.find((p) => p.saya);
		const babonLama = saya.babon;
		catatTangkapan(saya, ikan, kg);
		const peringkat = urutkan(l.peserta).findIndex((p) => p.saya) + 1;
		if (kg > babonLama) kabar(`🎣 Kamu dapat ${ikan.nama} ${kg.toLocaleString("id-ID")} kg — babon baru!`);
		simpan();
		return { peringkat, babonBaru: kg > babonLama, total: saya.total };
	},
});

export const namaIkan = (id) => IKAN_PER_ID[id]?.nama || "—";
