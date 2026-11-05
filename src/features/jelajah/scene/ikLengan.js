// IK dua ruas tepat: telapak mencapai titik (tx, ty, tz) rangka tokoh, dengan badan condong sebesar c.
// Bahu berputar x lalu z; sasaran yang menyilang badan dengan siku tertekuk di luar jangkauan
// kedua sumbu itu, sehingga sisanya diambil putaran y. Tokoh menolkan rotation.y tiap frame.
const PANJANG_ATAS = 0.29;
const PANJANG_BAWAH = 0.29;
const BAHU_Y = 1.43;
const MIRING_MAKS = 0.95; // sin putaran z terbesar sebelum putaran y ikut bekerja

export function ikLengan(atas, bawah, bahuX, tx, ty, tz, c = 0) {
	const dx = tx - bahuX;
	const dy = ty * Math.cos(c) + tz * Math.sin(c) - BAHU_Y;
	const dz = -ty * Math.sin(c) + tz * Math.cos(c);
	const asli = Math.hypot(dx, dy, dz) || 1;
	const d = Math.max(0.12, Math.min(PANJANG_ATAS + PANJANG_BAWAH - 0.005, asli));
	const tekuk = Math.acos((d * d - PANJANG_ATAS ** 2 - PANJANG_BAWAH ** 2) / (2 * PANJANG_ATAS * PANJANG_BAWAH));
	// telapak di rangka bahu sebelum diputar: (0, -p, q)
	const p = PANJANG_ATAS + PANJANG_BAWAH * Math.cos(tekuk);
	const q = PANJANG_BAWAH * Math.sin(tekuk);
	const skala = d / asli;
	const sisi = dx < 0 ? -1 : 1;
	const x = Math.abs(dx) * skala;
	const miring = Math.min(x / p, MIRING_MAKS);
	const z = Math.asin(miring);
	const a = p * miring;
	const r = Math.hypot(a, q);
	const y = x > a ? Math.asin(Math.min(1, x / r)) - Math.atan2(a, q) : 0;
	const sisaZ = -a * Math.sin(y) + q * Math.cos(y);
	atas.rotation.set(Math.atan2(-dz, -dy) - Math.atan2(-sisaZ, p * Math.cos(z)), y * sisi, z * sisi);
	bawah.rotation.x = -tekuk;
}
