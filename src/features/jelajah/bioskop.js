import { useSyncExternalStore } from "react";
import { bayarKoin } from "./pancing";
import { ubahTenaga } from "./tenaga";
import { catat, tambahXp } from "./progres";

// Bioskop Cibinong City Mall: beli tiket di loket, masuk studio, duduk di kursi mana saja —
// film diputar di layar sampai tamat (bisa ditinggal berdiri; tiketnya tetap berlaku).

export const HARGA_TIKET = 35;
export const FILM = { judul: "Petualang Situ Pemda", durasi: 72 };

// tiket: sudah dibayar; putar: { t } sedang menonton
export const bioskop = { tiket: false, putar: null, jeda: null };

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

export function beliTiket() {
	if (bioskop.tiket) return ubahTenaga(0, { teks: "🎟️ Tiket sudah ada — masuk studio lalu duduk di kursi mana saja", jenis: "info" });
	if (!bayarKoin(HARGA_TIKET)) return ubahTenaga(0, { teks: `Koin kurang (tiket 🪙 ${HARGA_TIKET}). Memancing dulu di Situ Pemda!`, jenis: "buruk" });
	bioskop.tiket = true;
	ubahTenaga(0, { teks: `🎟️ Tiket "${FILM.judul}" dibeli! Masuk studio di sebelah loket, lalu duduk`, jenis: "baik" });
	beritahu();
}

// dipanggil tiap frame selama duduk di kursi studio
export function tickNonton(dt) {
	if (!bioskop.putar) {
		if (!bioskop.tiket) return;
		// lanjut dari posisi terakhir bila tadi ditinggal berdiri
		bioskop.putar = bioskop.jeda || { t: 0 };
		ubahTenaga(0, { teks: bioskop.jeda ? "🎬 Film dilanjutkan" : "🎬 Lampu diredupkan… film dimulai. Selamat menonton!", jenis: "info" });
		bioskop.jeda = null;
		beritahu();
	}
	bioskop.putar.t += dt;
	if (bioskop.putar.t < FILM.durasi) return;
	bioskop.putar = null;
	bioskop.tiket = false;
	ubahTenaga(12, { teks: "🎬 Film tamat! Terhibur — tenaga +12", jenis: "baik" });
	catat("bioskop");
	tambahXp(30);
	beritahu();
}

export function berhentiNonton() {
	if (!bioskop.putar) return;
	ubahTenaga(0, { teks: "Film dijeda — duduk lagi untuk melanjutkan", jenis: "info" });
	// posisi terakhir disimpan; tiket masih berlaku
	bioskop.jeda = bioskop.putar;
	bioskop.putar = null;
	beritahu();
}
