// Film sejarah Kabupaten Bogor yang diputar di bioskop Cibinong City Mall. Tiap film berisi
// adegan bergambar (kanvas 640×275) dengan narasi yang diucapkan & ditulis sebagai subtitel.
// Isi narasi mengikuti catatan sejarah yang umum dikutip (prasasti, tahun, tokoh); gambarnya
// ilustrasi sederhana, bukan rekonstruksi.

const W = 640;
const H = 275;

function tulis(g, teks, x, y, ukuran, warna, tebal = 700, rata = "center") {
	g.font = `${tebal} ${ukuran}px "Segoe UI", system-ui, sans-serif`;
	g.textAlign = rata;
	g.textBaseline = "middle";
	g.fillStyle = warna;
	g.fillText(teks, x, y);
}
function gradasi(g, atas, bawah, y0 = 0, y1 = H) {
	const lg = g.createLinearGradient(0, y0, 0, y1);
	lg.addColorStop(0, atas);
	lg.addColorStop(1, bawah);
	g.fillStyle = lg;
	g.fillRect(0, y0, W, y1 - y0);
}
function bukit(g, warna, y, amp, frek, geser = 0) {
	g.fillStyle = warna;
	g.beginPath();
	g.moveTo(0, H);
	for (let x = 0; x <= W; x += 16) g.lineTo(x, y - Math.sin(x * frek + geser) * amp - Math.sin(x * frek * 2.3 + geser) * amp * 0.4);
	g.lineTo(W, H);
	g.fill();
}
function sungai(g, y, t, warna = "#2f7fa6") {
	g.fillStyle = warna;
	g.beginPath();
	g.moveTo(0, y);
	for (let x = 0; x <= W; x += 20) g.lineTo(x, y + Math.sin(x * 0.02 + t) * 3);
	g.lineTo(W, H);
	g.lineTo(0, H);
	g.fill();
	g.strokeStyle = "rgba(255,255,255,0.35)";
	g.lineWidth = 2;
	for (let i = 0; i < 12; i++) {
		const yy = y + 12 + (i % 6) * 14;
		const xx = ((i * 97 + t * 40) % (W + 60)) - 30;
		g.beginPath();
		g.moveTo(xx, yy);
		g.lineTo(xx + 24, yy);
		g.stroke();
	}
}
function pohon(g, x, y, s, warna = "#166534") {
	g.fillStyle = "#4a2f1a";
	g.fillRect(x - 3 * s, y - 20 * s, 6 * s, 20 * s);
	g.fillStyle = warna;
	g.beginPath();
	g.arc(x, y - 30 * s, 16 * s, 0, Math.PI * 2);
	g.arc(x - 12 * s, y - 22 * s, 11 * s, 0, Math.PI * 2);
	g.arc(x + 12 * s, y - 22 * s, 11 * s, 0, Math.PI * 2);
	g.fill();
}
function batu(g, x, y, lebar, tinggi, warna = "#6b6257") {
	g.fillStyle = warna;
	g.beginPath();
	g.ellipse(x, y, lebar, tinggi, 0, Math.PI, 0);
	g.fill();
	g.fillStyle = "rgba(255,255,255,0.08)";
	g.beginPath();
	g.ellipse(x - lebar * 0.3, y - tinggi * 0.5, lebar * 0.4, tinggi * 0.25, -0.2, 0, Math.PI * 2);
	g.fill();
}
function telapak(g, x, y, s, warna = "#2b241d") {
	g.fillStyle = warna;
	g.beginPath();
	g.ellipse(x, y, 7 * s, 15 * s, 0, 0, Math.PI * 2);
	g.fill();
	for (let i = 0; i < 5; i++) {
		g.beginPath();
		g.arc(x - 6 * s + i * 3 * s, y - 17 * s - Math.abs(i - 1.5) * 1.2 * s, 1.8 * s, 0, Math.PI * 2);
		g.fill();
	}
}
function aksara(g, x, y, t) {
	// goresan aksara Pallawa (ilustrasi): lengkung & garis berulang
	g.strokeStyle = "#2b241d";
	g.lineWidth = 2;
	for (let i = 0; i < 14; i++) {
		const xx = x + (i % 7) * 18;
		const yy = y + Math.floor(i / 7) * 20;
		if (i > t * 14) break;
		g.beginPath();
		g.arc(xx, yy, 5, Math.PI * (0.2 + (i % 3) * 0.3), Math.PI * (1.4 + (i % 2) * 0.4));
		g.moveTo(xx + 6, yy - 6);
		g.lineTo(xx + 6, yy + 6);
		g.stroke();
	}
}
function bangunanKolonial(g, x, y, s) {
	g.fillStyle = "#f5f1e8";
	g.fillRect(x - 90 * s, y - 50 * s, 180 * s, 50 * s);
	g.fillStyle = "#e7e0d0";
	g.beginPath();
	g.moveTo(x - 40 * s, y - 50 * s);
	g.lineTo(x, y - 78 * s);
	g.lineTo(x + 40 * s, y - 50 * s);
	g.fill();
	g.fillStyle = "#ffffff";
	for (let i = -3; i <= 3; i++) g.fillRect(x + i * 22 * s - 4 * s, y - 48 * s, 8 * s, 46 * s);
	g.fillStyle = "#b6aa94";
	g.fillRect(x - 95 * s, y - 2 * s, 190 * s, 4 * s);
}
function rusa(g, x, y, s) {
	g.fillStyle = "#8b5a2b";
	g.beginPath();
	g.ellipse(x, y, 14 * s, 7 * s, 0, 0, Math.PI * 2);
	g.fill();
	g.fillRect(x - 10 * s, y, 2.5 * s, 12 * s);
	g.fillRect(x + 8 * s, y, 2.5 * s, 12 * s);
	g.fillRect(x + 11 * s, y - 14 * s, 4 * s, 12 * s);
	g.beginPath();
	g.ellipse(x + 15 * s, y - 15 * s, 5 * s, 3.5 * s, 0.3, 0, Math.PI * 2);
	g.fill();
	g.strokeStyle = "#5b3a1a";
	g.lineWidth = 1.5 * s;
	g.beginPath();
	g.moveTo(x + 14 * s, y - 18 * s);
	g.lineTo(x + 12 * s, y - 28 * s);
	g.moveTo(x + 13 * s, y - 24 * s);
	g.lineTo(x + 8 * s, y - 27 * s);
	g.stroke();
}
function gedungPemda(g, x, y, s) {
	g.fillStyle = "#f1ede4";
	g.fillRect(x - 70 * s, y - 60 * s, 140 * s, 60 * s);
	g.fillStyle = "#4f6f4f";
	g.beginPath();
	g.moveTo(x - 80 * s, y - 60 * s);
	g.lineTo(x, y - 88 * s);
	g.lineTo(x + 80 * s, y - 60 * s);
	g.fill();
	g.fillStyle = "#4f6378";
	for (let r = 0; r < 3; r++) for (let c = -5; c <= 5; c++) g.fillRect(x + c * 12 * s - 4 * s, y - 52 * s + r * 17 * s, 8 * s, 10 * s);
}
function judul(g, t, besar, kecil, warna = "#facc15") {
	g.fillStyle = "#000";
	g.fillRect(0, 0, W, H);
	g.globalAlpha = Math.min(1, t * 1.6, (1 - t) * 3);
	tulis(g, besar, W / 2, H / 2 - 18, 46, warna);
	tulis(g, kecil, W / 2, H / 2 + 30, 20, "#e5e7eb", 500);
	g.globalAlpha = 1;
}
function tamat(g, t, baris) {
	g.fillStyle = "#000";
	g.fillRect(0, 0, W, H);
	g.globalAlpha = Math.min(1, t * 2);
	const geser = Math.max(0, t - 0.3) * 160;
	tulis(g, "TAMAT", W / 2, H / 2 - 30 - geser, 60, "#facc15");
	baris.forEach((b, i) => tulis(g, b, W / 2, H / 2 + 40 + i * 32 - geser, 18, "#e5e7eb", 500));
	g.globalAlpha = 1;
}
const KREDIT = ["Produksi — Bioskop Cibinong City Mall", "Persembahan — DPMD Kabupaten Bogor", "Terima kasih sudah menonton 🍿"];

// adegan: [mulai (dtk), lama (dtk), gambar(g, u 0..1, t dtk), narasi]
export const FILM = [
	{
		id: "purnawarman",
		judul: "Jejak Purnawarman",
		zaman: "Tarumanagara · abad ke-5",
		ikon: "🦶",
		warna: "#7c2d12",
		musik: "kuno",
		adegan: [
			[6, (g, u) => judul(g, u, "JEJAK PURNAWARMAN", "Kerajaan Tarumanagara · abad ke-5 Masehi"), "Jejak Purnawarman. Kisah Kerajaan Tarumanagara di tanah Bogor."],
			[12, (g, u, t) => {
				gradasi(g, "#7dd3fc", "#e0f2fe", 0, H * 0.55);
				bukit(g, "#3f6212", H * 0.5, 14, 0.012);
				sungai(g, H * 0.62, t);
				for (let i = 0; i < 6; i++) pohon(g, 40 + i * 115, H * 0.6, 1 + (i % 2) * 0.3);
				tulis(g, "Ciaruteun", 150, H * 0.75, 15, "#e0f2fe", 600);
				tulis(g, "Cisadane", 470, H * 0.8, 15, "#e0f2fe", 600);
			}, "Sekitar lima belas abad silam, di dekat pertemuan Sungai Ciaruteun dan Cisadane, berkuasa Kerajaan Tarumanagara."],
			[13, (g, u) => {
				gradasi(g, "#a3e635", "#3f6212");
				batu(g, W / 2, H * 0.85, 190, 120);
				telapak(g, W / 2 - 24, H * 0.62, 1.6 * Math.min(1, u * 3));
				telapak(g, W / 2 + 24, H * 0.6, 1.6 * Math.min(1, u * 3));
				aksara(g, W / 2 - 60, H * 0.77, u);
			}, "Raja Purnawarman meninggalkan sebuah prasasti di batu besar: sepasang telapak kaki dan tulisan berhuruf Pallawa dalam bahasa Sanskerta."],
			[15, (g, u) => {
				gradasi(g, "#292524", "#0c0a09");
				g.globalAlpha = Math.min(1, u * 3);
				const baris = ["“Inilah sepasang telapak kaki", "yang seperti kaki Dewa Wisnu,", "ialah telapak kaki Yang Mulia Purnawarman,", "raja di negeri Taruma,", "raja yang gagah berani di dunia.”"];
				baris.forEach((b, i) => tulis(g, b, W / 2, 50 + i * 36, 22, "#fde68a", 600));
				g.globalAlpha = 1;
			}, "Isinya kurang lebih: Inilah sepasang telapak kaki yang seperti kaki Dewa Wisnu, ialah telapak kaki Yang Mulia Purnawarman, raja di negeri Taruma, raja yang gagah berani di dunia."],
			[12, (g, u, t) => {
				gradasi(g, "#bae6fd", "#f0f9ff", 0, H * 0.6);
				bukit(g, "#4d7c0f", H * 0.62, 10, 0.015);
				g.fillStyle = "#a8a29e";
				g.fillRect(W / 2 - 90, H * 0.48, 180, 8);
				[-80, 80].forEach((dx) => g.fillRect(W / 2 + dx - 4, H * 0.48, 8, 50));
				batu(g, W / 2, H * 0.78, 60, 34);
				telapak(g, W / 2 - 10, H * 0.7, 0.6);
				telapak(g, W / 2 + 10, H * 0.69, 0.6);
				tulis(g, "Situs Prasasti Ciaruteun", W / 2, 34, 22, "#0f172a");
				tulis(g, "Desa Ciaruteun Ilir · Kec. Cibungbulang · Kab. Bogor", W / 2, 62, 15, "#334155", 600);
				g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 2);
				tulis(g, "🐘 Prasasti Kebon Kopi: jejak kaki gajah", W / 2, H - 50, 15, "#78350f", 600);
				g.globalAlpha = 1;
			}, "Prasasti Ciaruteun kini dijaga sebagai cagar budaya di Desa Ciaruteun Ilir, Kecamatan Cibungbulang. Di dekatnya ditemukan pula Prasasti Kebon Kopi yang berukir jejak kaki gajah."],
			[9, (g, u) => tamat(g, u, KREDIT), "Jejak para leluhur masih bisa kita kunjungi hingga kini."],
		],
	},
	{
		id: "pajajaran",
		judul: "Pakuan Pajajaran",
		zaman: "Kerajaan Sunda · 1482–1579",
		ikon: "👑",
		warna: "#065f46",
		musik: "kerajaan",
		adegan: [
			[6, (g, u) => judul(g, u, "PAKUAN PAJAJARAN", "Kerajaan Sunda · 1482–1579", "#fcd34d"), "Pakuan Pajajaran. Kisah ibu kota Kerajaan Sunda."],
			[13, (g, u, t) => {
				gradasi(g, "#fde68a", "#f59e0b", 0, H * 0.6);
				g.fillStyle = "#fef3c7";
				g.beginPath();
				g.arc(W * 0.8, H * 0.3, 30, 0, Math.PI * 2);
				g.fill();
				bukit(g, "#14532d", H * 0.6, 20, 0.01);
				sungai(g, H * 0.75, t, "#1e6091");
				// keraton panggung beratap ijuk
				const kx = W / 2;
				g.fillStyle = "#7c4a24";
				g.fillRect(kx - 70, H * 0.55, 140, 30);
				g.fillStyle = "#1c1917";
				g.beginPath();
				g.moveTo(kx - 90, H * 0.55);
				g.lineTo(kx, H * 0.3);
				g.lineTo(kx + 90, H * 0.55);
				g.fill();
				tulis(g, "Ciliwung", 110, H * 0.86, 14, "#e0f2fe", 600);
				tulis(g, "Cisadane", 530, H * 0.86, 14, "#e0f2fe", 600);
			}, "Pakuan, ibu kota Kerajaan Sunda, berdiri di antara Sungai Ciliwung dan Cisadane, di wilayah Bogor sekarang."],
			[14, (g, u) => {
				gradasi(g, "#78350f", "#451a03");
				g.globalAlpha = Math.min(1, u * 2.5);
				tulis(g, "3 Juni 1482", W / 2, 54, 40, "#fde68a");
				// mahkota
				g.fillStyle = "#facc15";
				g.beginPath();
				const mx = W / 2;
				const my = 150;
				g.moveTo(mx - 50, my + 25);
				g.lineTo(mx - 50, my - 10);
				g.lineTo(mx - 25, my + 8);
				g.lineTo(mx, my - 25);
				g.lineTo(mx + 25, my + 8);
				g.lineTo(mx + 50, my - 10);
				g.lineTo(mx + 50, my + 25);
				g.fill();
				tulis(g, "Sri Baduga Maharaja · Prabu Siliwangi", W / 2, 215, 22, "#ffffff");
				g.globalAlpha = 1;
			}, "Pada tanggal 3 Juni 1482, Sri Baduga Maharaja dinobatkan menjadi raja di Pakuan Pajajaran. Rakyat mengenangnya sebagai Prabu Siliwangi."],
			[10, (g, u, t) => {
				gradasi(g, "#0c4a6e", "#082f49");
				for (let i = 0; i < 30; i++) {
					g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + i);
					g.fillStyle = ["#f472b6", "#facc15", "#38bdf8"][i % 3];
					g.fillRect((i * 53) % W, (i * 37 + t * 60) % H, 6, 10);
				}
				g.globalAlpha = 1;
				tulis(g, "HARI JADI BOGOR", W / 2, H / 2 - 16, 44, "#fde047");
				tulis(g, "diperingati setiap 3 Juni", W / 2, H / 2 + 28, 20, "#e0f2fe", 600);
			}, "Hari penobatan itu kini diperingati sebagai Hari Jadi Bogor, setiap tanggal 3 Juni."],
			[13, (g, u) => {
				gradasi(g, "#d9f99d", "#65a30d");
				g.fillStyle = "#57534e";
				g.fillRect(W / 2 - 95, 40, 190, 175);
				g.fillStyle = "#78716c";
				g.beginPath();
				g.moveTo(W / 2 - 100, 40);
				g.lineTo(W / 2, 12);
				g.lineTo(W / 2 + 100, 40);
				g.fill();
				batu(g, W / 2, 205, 60, 90, "#4b4540");
				aksara(g, W / 2 - 55, 150, u);
				tulis(g, "Prasasti Batutulis · 1533", W / 2, H - 22, 18, "#1a2e05");
			}, "Pada tahun 1533, Prabu Surawisesa membuat Prasasti Batutulis untuk mengenang kebesaran ayahnya, Sri Baduga Maharaja."],
			[11, (g, u) => {
				gradasi(g, "#450a0a", "#1c1917");
				g.globalAlpha = 1 - u * 0.5;
				g.fillStyle = "#292524";
				g.beginPath();
				g.moveTo(W / 2 - 90, H * 0.7);
				g.lineTo(W / 2, H * 0.4);
				g.lineTo(W / 2 + 90, H * 0.7);
				g.fill();
				g.globalAlpha = 1;
				for (let i = 0; i < 20; i++) {
					g.fillStyle = `rgba(251,146,60,${0.3 + 0.3 * Math.sin(u * 10 + i)})`;
					g.beginPath();
					g.arc(W / 2 - 100 + i * 10, H * 0.7 - Math.abs(Math.sin(i + u * 6)) * 40, 4, 0, Math.PI * 2);
					g.fill();
				}
				tulis(g, "1579", W / 2, 50, 42, "#fca5a5");
			}, "Pada tahun 1579, Pakuan jatuh oleh serangan pasukan Banten, dan berakhirlah Kerajaan Sunda Pajajaran."],
			[9, (g, u) => tamat(g, u, ["Semangat Siliwangi tetap hidup di Tatar Sunda", ...KREDIT]), "Namun semangat Siliwangi tetap hidup di Tatar Sunda."],
		],
	},
	{
		id: "buitenzorg",
		judul: "Buitenzorg",
		zaman: "Bogor masa kolonial · 1745–1817",
		ikon: "🏛️",
		warna: "#1e3a8a",
		musik: "kolonial",
		adegan: [
			[6, (g, u) => judul(g, u, "BUITENZORG", "Bogor masa kolonial · 1745–1817", "#bfdbfe"), "Buitenzorg. Bogor di masa kolonial."],
			[14, (g, u) => {
				gradasi(g, "#93c5fd", "#eff6ff", 0, H * 0.65);
				bukit(g, "#4d7c0f", H * 0.7, 6, 0.02);
				bangunanKolonial(g, W / 2, H * 0.72, 1);
				rusa(g, 120 + u * 40, H * 0.85, 1);
				rusa(g, 500 - u * 30, H * 0.88, 0.8);
				tulis(g, "1745", 70, 34, 30, "#1e3a8a");
			}, "Tahun 1745, Gubernur Jenderal Gustaaf Willem van Imhoff membangun rumah peristirahatan dan menamai wilayahnya Buitenzorg, yang berarti tanpa kekhawatiran."],
			[9, (g) => {
				gradasi(g, "#bfdbfe", "#f8fafc", 0, H * 0.6);
				g.fillStyle = "#65a30d";
				g.fillRect(0, H * 0.6, W, H);
				bangunanKolonial(g, W / 2, H * 0.7, 1.4);
				tulis(g, "Istana Bogor", W / 2, 30, 26, "#0f172a");
			}, "Rumah peristirahatan itu kelak berkembang menjadi Istana Bogor."],
			[12, (g, u) => {
				gradasi(g, "#fde68a", "#fef3c7", 0, H * 0.5);
				g.fillStyle = "#a16207";
				g.fillRect(0, H * 0.5, W, H);
				g.fillStyle = "#78716c";
				g.beginPath();
				g.moveTo(W / 2 - 30, H * 0.5);
				g.lineTo(W / 2 + 30, H * 0.5);
				g.lineTo(W, H);
				g.lineTo(0, H);
				g.fill();
				// kereta kuda melintas
				const x = -60 + u * (W + 120);
				g.fillStyle = "#3f2a1d";
				g.fillRect(x, H * 0.72, 60, 24);
				g.fillStyle = "#111";
				g.beginPath();
				g.arc(x + 12, H * 0.82, 9, 0, Math.PI * 2);
				g.arc(x + 48, H * 0.82, 9, 0, Math.PI * 2);
				g.fill();
				g.fillStyle = "#7c4a24";
				g.fillRect(x + 64, H * 0.72, 28, 14);
				tulis(g, "Jalan Raya Pos · 1808–1811", W / 2, 40, 24, "#78350f");
			}, "Antara tahun 1808 dan 1811, Gubernur Jenderal Daendels membangun Jalan Raya Pos yang melintasi Buitenzorg."],
			[14, (g, u) => {
				gradasi(g, "#bbf7d0", "#f0fdf4", 0, H * 0.55);
				g.fillStyle = "#4d7c0f";
				g.fillRect(0, H * 0.55, W, H);
				for (let i = 0; i < 9; i++) pohon(g, 30 + i * 72, H * 0.9 - (i % 2) * 10, 1.2 + (i % 3) * 0.3, ["#166534", "#15803d", "#14532d"][i % 3]);
				g.globalAlpha = Math.min(1, u * 2);
				tulis(g, "18 Mei 1817", W / 2, 36, 30, "#14532d");
				tulis(g, "Kebun Raya Bogor · C.G.C. Reinwardt", W / 2, 70, 18, "#166534", 600);
				g.globalAlpha = 1;
			}, "Pada 18 Mei 1817, Reinwardt mendirikan Kebun Raya di samping istana, pusat penelitian tumbuhan tropis yang masih hidup hingga kini."],
			[9, (g, u) => tamat(g, u, ["Kini kembali bernama Bogor", ...KREDIT]), "Nama Buitenzorg kemudian kembali menjadi Bogor."],
		],
	},
	{
		id: "tegarberiman",
		judul: "Tegar Beriman",
		zaman: "Cibinong ibu kota kabupaten · 1982–kini",
		ikon: "🏢",
		warna: "#0e7490",
		musik: "modern",
		adegan: [
			[6, (g, u) => judul(g, u, "TEGAR BERIMAN", "Cibinong, ibu kota Kabupaten Bogor", "#67e8f9"), "Tegar Beriman. Kisah Cibinong menjadi ibu kota Kabupaten Bogor."],
			[11, (g) => {
				gradasi(g, "#e0f2fe", "#f8fafc", 0, H * 0.6);
				g.fillStyle = "#94a3b8";
				g.fillRect(0, H * 0.6, W, H);
				bangunanKolonial(g, W / 2, H * 0.68, 1);
				tulis(g, "Kota Bogor", W / 2, 34, 24, "#0f172a");
			}, "Dahulu, pemerintahan Kabupaten Bogor berkantor di Kota Bogor."],
			[13, (g, u) => {
				gradasi(g, "#f1f5f9", "#cbd5e1");
				g.fillStyle = "#fff";
				g.fillRect(W / 2 - 150, 24, 300, 220);
				g.strokeStyle = "#94a3b8";
				g.strokeRect(W / 2 - 150, 24, 300, 220);
				tulis(g, "PERATURAN PEMERINTAH", W / 2, 54, 18, "#0f172a");
				tulis(g, "Nomor 6 Tahun 1982", W / 2, 82, 18, "#0f172a", 600);
				g.globalAlpha = Math.min(1, u * 2);
				tulis(g, "Ibu kota Kabupaten Bogor", W / 2, 140, 18, "#334155", 500);
				tulis(g, "CIBINONG", W / 2, 180, 34, "#b91c1c");
				g.globalAlpha = 1;
			}, "Melalui Peraturan Pemerintah Nomor 6 Tahun 1982, Cibinong ditetapkan sebagai ibu kota Kabupaten Bogor."],
			[13, (g, u) => {
				gradasi(g, "#7dd3fc", "#e0f2fe", 0, H * 0.6);
				g.fillStyle = "#86efac";
				g.fillRect(0, H * 0.6, W, H);
				gedungPemda(g, W * 0.3, H * 0.72, 1);
				gedungPemda(g, W * 0.72, H * 0.74, 0.8);
				g.fillStyle = "#38bdf8";
				g.beginPath();
				g.ellipse(W * 0.5, H * 0.9, 130, 18, 0, 0, Math.PI * 2);
				g.fill();
				tulis(g, "Situ Pemda", W * 0.5, H * 0.9, 13, "#0c4a6e", 600);
				tulis(g, "Kawasan Pemerintahan Tegar Beriman", W / 2, 30, 22, "#0f172a");
				g.globalAlpha = u;
			}, "Pusat pemerintahan pun dibangun di kawasan Tegar Beriman: kantor bupati, DPRD, dinas-dinas, alun-alun, dan Situ Pemda."],
			[14, (g, u) => {
				gradasi(g, "#0e7490", "#164e63");
				const huruf = [["TE", "Tertib"], ["GAR", "Segar"], ["BER", "Bersih"], ["I", "Indah"], ["MAN", "Mandiri, Aman, Nyaman"]];
				huruf.forEach(([a, b], i) => {
					if (u * 6 < i) return;
					tulis(g, a, 120, 40 + i * 46, 30, "#fde047", 800, "right");
					tulis(g, `— ${b}`, 135, 40 + i * 46, 22, "#ffffff", 600, "left");
				});
			}, "Tegar Beriman adalah semboyan Kabupaten Bogor: tertib, segar, bersih, indah, mandiri, aman, dan nyaman."],
			[12, (g, u, t) => {
				gradasi(g, "#ecfccb", "#bef264");
				for (let i = 0; i < 40; i++) {
					const x = 30 + (i % 10) * 64;
					const y = 50 + Math.floor(i / 10) * 50;
					g.fillStyle = i <= u * 40 ? "#15803d" : "#d9f99d";
					g.beginPath();
					g.moveTo(x, y - 12);
					g.lineTo(x + 12, y);
					g.lineTo(x + 8, y + 12);
					g.lineTo(x - 8, y + 12);
					g.lineTo(x - 12, y);
					g.fill();
				}
				g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 2);
				tulis(g, "40 kecamatan · ratusan desa & kelurahan", W / 2, H - 22, 18, "#14532d");
				g.globalAlpha = 1;
			}, "Kini Kabupaten Bogor terdiri atas empat puluh kecamatan, dengan ratusan desa dan kelurahan."],
			[9, (g, u) => tamat(g, u, ["DPMD mendampingi desa membangun bersama warga", ...KREDIT]), "DPMD hadir mendampingi desa-desa membangun bersama warganya."],
		],
	},
];
export const FILM_PER_ID = Object.fromEntries(FILM.map((f) => [f.id, f]));
// hitung mundur pita film sebelum adegan pertama
export const PEMBUKA = 5;
export const durasiFilm = (f) => PEMBUKA + f.adegan.reduce((s, a) => s + a[0], 0);

// Adegan pada detik t: { i, u (0..1 dalam adegan), narasi } atau null (hitung mundur/selesai).
export function adeganDi(f, t) {
	let mulai = PEMBUKA;
	for (let i = 0; i < f.adegan.length; i++) {
		const lama = f.adegan[i][0];
		if (t < mulai + lama) return t < mulai ? null : { i, u: (t - mulai) / lama, narasi: f.adegan[i][2], mulai };
		mulai += lama;
	}
	return null;
}

function hitungMundur(g, t) {
	g.fillStyle = "#2a2a2a";
	g.fillRect(0, 0, W, H);
	const n = Math.max(1, 3 - Math.floor(t / (PEMBUKA / 3)));
	const f = (t % (PEMBUKA / 3)) / (PEMBUKA / 3);
	g.fillStyle = "#4a4a4a";
	g.beginPath();
	g.moveTo(W / 2, H / 2);
	g.arc(W / 2, H / 2, 160, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2);
	g.fill();
	g.strokeStyle = "#cfcfcf";
	g.lineWidth = 3;
	for (const r of [90, 110]) {
		g.beginPath();
		g.arc(W / 2, H / 2, r, 0, Math.PI * 2);
		g.stroke();
	}
	tulis(g, String(n), W / 2, H / 2 + 4, 120, "#f5f5f5");
}

// subtitel dipecah dua baris bila panjang
function subtitel(g, teks) {
	g.font = `600 17px "Segoe UI", system-ui, sans-serif`;
	g.textAlign = "center";
	g.textBaseline = "middle";
	const kata = teks.split(" ");
	const baris = [];
	let kini = "";
	for (const k of kata) {
		const coba = kini ? `${kini} ${k}` : k;
		if (g.measureText(coba).width > W - 60 && kini) {
			baris.push(kini);
			kini = k;
		} else kini = coba;
	}
	baris.push(kini);
	const tampil = baris.slice(-2);
	tampil.forEach((b, i) => {
		const y = H - 18 - (tampil.length - 1 - i) * 21;
		g.lineWidth = 4;
		g.strokeStyle = "#000";
		g.strokeText(b, W / 2, y);
		g.fillStyle = "#fff";
		g.fillText(b, W / 2, y);
	});
}

export function gambarFilm(g, f, t) {
	g.save();
	const a = adeganDi(f, t);
	if (!a) hitungMundur(g, Math.min(t, PEMBUKA - 0.01));
	else {
		f.adegan[a.i][1](g, a.u, t);
		// subtitel mengikuti narasi: ditampilkan bertahap per kalimat selama adegan
		const kalimat = a.narasi.split(/(?<=[.:])\s+/);
		const k = kalimat[Math.min(kalimat.length - 1, Math.floor(a.u * kalimat.length))];
		subtitel(g, k);
	}
	const v = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.6);
	v.addColorStop(0, "rgba(0,0,0,0)");
	v.addColorStop(1, "rgba(0,0,0,0.45)");
	g.fillStyle = v;
	g.fillRect(0, 0, W, H);
	g.restore();
}

export function gambarJeda(g, t, film, harga) {
	const lg = g.createLinearGradient(0, 0, W, H);
	lg.addColorStop(0, "#3b0764");
	lg.addColorStop(1, "#1e3a8a");
	g.fillStyle = lg;
	g.fillRect(0, 0, W, H);
	g.fillStyle = "rgba(255,255,255,0.08)";
	const x = ((t * 120) % (W + 300)) - 150;
	g.beginPath();
	g.moveTo(x, 0);
	g.lineTo(x + 80, 0);
	g.lineTo(x - 40, H);
	g.lineTo(x - 120, H);
	g.fill();
	tulis(g, "FILM SEJARAH KABUPATEN BOGOR", W / 2, 34, 20, "#f9a8d4");
	film.forEach((f, i) => tulis(g, `${f.ikon} ${f.judul} — ${f.zaman}`, W / 2, 78 + i * 34, 19, "#ffffff", 600));
	tulis(g, `🎟️ Tiket 🪙 ${harga} di loket · duduk di kursi mana saja`, W / 2, H - 26, 16, "#e0e7ff", 500);
}
