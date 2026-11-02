import { useSyncExternalStore } from "react";
import { FILM_PER_ID, adeganDi, durasiFilm } from "./film";
import { bayarKoin } from "./pancing";
import { ubahTenaga } from "./tenaga";
import { catat, tambahXp } from "./progres";
import { diamkan, ucapkan } from "./suaraOrang";

// Bioskop Cibinong City Mall (Lt 4): pilih film sejarah Kabupaten Bogor di loket, masuk studio,
// duduk di kursi mana saja — film diputar di layar dengan narasi bersuara sampai tamat (bisa
// ditinggal berdiri; tiketnya tetap berlaku dan film dilanjutkan saat duduk lagi).

export const HARGA_TIKET = 35;

// tiket: id film yang sudah dibayar; putar: { t, adegan } sedang menonton; jeda: posisi terakhir
export const bioskop = { tiket: null, putar: null, jeda: null };

let versi = 0;
const pendengar = new Set();
const beritahu = () => {
	versi++;
	pendengar.forEach((f) => f());
};
export const useBioskop = () =>
	useSyncExternalStore(
		(f) => (pendengar.add(f), () => pendengar.delete(f)),
		() => versi,
	);

export function beliTiket(id) {
	const film = FILM_PER_ID[id];
	if (!film) return;
	if (bioskop.tiket) return ubahTenaga(0, { teks: `🎟️ Tiket "${FILM_PER_ID[bioskop.tiket].judul}" sudah ada — masuk Studio 1 lalu duduk`, jenis: "info" });
	if (!bayarKoin(HARGA_TIKET)) return ubahTenaga(0, { teks: `Koin kurang (tiket 🪙 ${HARGA_TIKET}). Memancing dulu di Situ Pemda!`, jenis: "buruk" });
	bioskop.tiket = id;
	bioskop.jeda = null;
	ubahTenaga(0, { teks: `🎟️ Tiket "${film.judul}" dibeli! Masuk Studio 1 di sebelah loket, lalu duduk`, jenis: "baik" });
	beritahu();
}

// dipanggil tiap frame selama duduk di kursi studio
export function tickNonton(dt, kursi) {
	if (!bioskop.putar) {
		if (!bioskop.tiket) return;
		// lanjut dari posisi terakhir bila tadi ditinggal berdiri
		bioskop.putar = bioskop.jeda || { t: 0, adegan: -1 };
		bioskop.putar.adegan = -1;
		ubahTenaga(0, { teks: bioskop.jeda ? "🎬 Film dilanjutkan" : "🎬 Lampu diredupkan… film dimulai. Selamat menonton!", jenis: "info" });
		bioskop.jeda = null;
		beritahu();
	}
	const film = FILM_PER_ID[bioskop.tiket];
	const p = bioskop.putar;
	p.t += dt;
	// narasi tiap adegan diucapkan sekali saat adegannya mulai
	const a = adeganDi(film, p.t);
	if (a && a.i !== p.adegan) {
		p.adegan = a.i;
		ucapkan(a.narasi, { x: kursi?.x, z: kursi?.z, perempuan: film.id === "buitenzorg" || film.id === "tegarberiman", penting: true, jangkau: 40, nada: -0.1 });
	}
	if (p.t < durasiFilm(film)) return;
	bioskop.putar = null;
	bioskop.tiket = null;
	ubahTenaga(12, { teks: `🎬 "${film.judul}" tamat! Wawasan sejarah bertambah — tenaga +12`, jenis: "baik" });
	catat("bioskop");
	tambahXp(30);
	beritahu();
}

export function berhentiNonton() {
	if (!bioskop.putar) return;
	diamkan();
	ubahTenaga(0, { teks: "Film dijeda — duduk lagi untuk melanjutkan", jenis: "info" });
	bioskop.jeda = bioskop.putar;
	bioskop.putar = null;
	beritahu();
}
