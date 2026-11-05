import { posisi } from "./jelajahStore";
import { suaraMati } from "./suaraPancing";

// Narasi film bioskop lewat sintesis ucapan peramban (Web Speech API, suara id-ID); percakapan
// orang di dunia cukup balon kata. Bila peramban tidak punya suara Bahasa Indonesia, tidak ada
// yang diucapkan (logat asing justru terdengar aneh) — subtitel tetap tampil.

const sintesis = typeof window !== "undefined" ? window.speechSynthesis : null;
let suaraId = [];
function muatSuara() {
	if (!sintesis) return;
	suaraId = sintesis.getVoices().filter((v) => /^id([-_]|$)/i.test(v.lang) || /indonesia/i.test(v.name));
}
if (sintesis) {
	muatSuara();
	sintesis.addEventListener?.("voiceschanged", muatSuara);
}

export const bisaBicara = () => !!sintesis && suaraId.length > 0;

let bicaraSampai = 0;
let jedaSampai = 0;

// teks: kalimat; x, z: asal suara (untuk volume); perempuan: suara lebih tinggi;
// penting: sapaan langsung ke pemain (boleh memotong obrolan latar).
export function ucapkan(teks, { x = posisi.x, z = posisi.z, perempuan = Math.random() < 0.5, penting = false, jangkau = 14, nada = 0 } = {}) {
	if (!bisaBicara() || suaraMati.nilai || document.hidden || !teks) return false;
	const kini = performance.now();
	const jarak = Math.hypot(x - posisi.x, z - posisi.z);
	if (jarak > jangkau) return false;
	if (sintesis.speaking || kini < bicaraSampai) {
		if (!penting) return false;
		sintesis.cancel();
	} else if (!penting && kini < jedaSampai) return false;
	const u = new SpeechSynthesisUtterance(teks.replace(/\p{Extended_Pictographic}|️/gu, ""));
	u.lang = "id-ID";
	// suara Indonesia yang ada dipakai bergantian; nada & kecepatan membedakan orangnya
	u.voice = suaraId[(perempuan ? 1 : 0) % suaraId.length] || suaraId[0];
	u.pitch = Math.max(0.5, Math.min(1.8, (perempuan ? 1.25 : 0.85) + nada));
	u.rate = 1.0 + (Math.random() - 0.5) * 0.15;
	u.volume = Math.max(0.15, Math.min(1, 1.1 - jarak / jangkau)) * (penting ? 1 : 0.7);
	bicaraSampai = kini + 600 + teks.length * 70;
	jedaSampai = bicaraSampai + (penting ? 1500 : 3500);
	try {
		sintesis.speak(u);
	} catch {
		return false;
	}
	return true;
}

export function diamkan() {
	try {
		sintesis?.cancel();
	} catch {
		/* abaikan */
	}
}

// Kalimat siap pakai
export const SAPAAN_JALAN = [
	"Permisi.",
	"Mari, Kak.",
	"Selamat siang!",
	"Monggo, lewat dulu.",
	"Halo, apa kabar?",
	"Hati-hati di jalan, ya.",
	"Mau ke mana, Kak?",
	"Panas ya hari ini.",
];
export const SAPAAN_MALAM = ["Selamat malam.", "Mari, Kak.", "Permisi, mau pulang dulu.", "Malam-malam jalan-jalan, nih?"];
export const SAPAAN_PAGI = ["Selamat pagi!", "Pagi, Kak. Mari.", "Wah, pagi-pagi sudah jalan-jalan."];
