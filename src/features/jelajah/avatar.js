// Profil tamu (nama, jenis kelamin, avatar, warna kulit, mode sendiri/bersama) yang diisi sebelum mulai
// jelajah. Disimpan di perangkat supaya kunjungan berikutnya tidak perlu mengisi lagi.

const KUNCI = "jelajah-dpmd-profil";

export const WARNA_KULIT = ["#f1c9a5", "#d9ad85", "#a8754f"];

// Empat pilihan pakaian per jenis kelamin. Bidang-bidangnya sama dengan
// penampilan pegawai (lihat scene/orang.js), dengan seragam "warga".
export const AVATAR = {
	L: [
		{ nama: "Kemeja oranye", baju: "#e0703a", celana: "#1e3a5f", rambut: "#20160f" },
		{ nama: "Batik cokelat", baju: "#8a4b22", celana: "#2a2a2e", rambut: "#1a120c" },
		{ nama: "Kaos biru", baju: "#2f6db0", celana: "#3b3f46", rambut: "#2b1d12" },
		{ nama: "Jaket hijau", baju: "#2f6b4f", celana: "#1f2933", rambut: "#151515", kacamata: true },
	],
	P: [
		{ nama: "Kerudung merah muda", baju: "#f4f1ec", celana: "#5b4a6b", jilbab: "#d97a9b", rok: true },
		{ nama: "Kerudung biru", baju: "#2f6db0", celana: "#1e2a3a", jilbab: "#9cc3e6" },
		{ nama: "Rambut panjang", baju: "#c4532d", celana: "#2a2a2e", rambut: "#2b1d12", rok: true },
		{ nama: "Kerudung hitam", baju: "#6b8f71", celana: "#2a2a2e", jilbab: "#1c1c1c", kacamata: true, rok: true },
	],
};

export function penampilanAvatar({ jk = "L", avatar = 0, kulit = 1 } = {}) {
	const pilihan = AVATAR[jk === "P" ? "P" : "L"];
	const a = pilihan[avatar] || pilihan[0];
	return {
		seragam: "warga",
		perempuan: jk === "P",
		kulit: WARNA_KULIT[kulit] || WARNA_KULIT[1],
		rambut: a.rambut || "#20160f",
		baju: a.baju,
		celana: a.celana,
		jilbab: a.jilbab || null,
		rok: !!a.rok,
		kacamata: !!a.kacamata,
	};
}

export const rapikanNama = (n) => String(n || "").replace(/\s+/g, " ").trim().slice(0, 24);

export function bacaProfil() {
	try {
		const p = JSON.parse(localStorage.getItem(KUNCI) || "null");
		if (!p || typeof p !== "object") return null;
		return {
			nama: rapikanNama(p.nama),
			jk: p.jk === "P" ? "P" : "L",
			avatar: Number.isInteger(p.avatar) && p.avatar >= 0 && p.avatar < 4 ? p.avatar : 0,
			kulit: Number.isInteger(p.kulit) && p.kulit >= 0 && p.kulit < 3 ? p.kulit : 1,
			mode: p.mode === "sendiri" ? "sendiri" : "bersama",
		};
	} catch {
		return null;
	}
}

export function simpanProfil(p) {
	try {
		localStorage.setItem(KUNCI, JSON.stringify(p));
	} catch {
		// mode privat: profil cukup bertahan selama halaman terbuka
	}
}
