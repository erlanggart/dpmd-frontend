// Uji kontrak klien–server Jelajah: socket.io-client sungguhan melawan jelajah.socket.js dari
// repo backend di sebelah, tanpa basis data. Jalankan: npm run test:jelajah-socket
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { io as sambung } from "socket.io-client";

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../dpmd-fahri-express");
const dirData = fs.mkdtempSync(path.join(os.tmpdir(), "jelajah-socket-"));
process.env.JELAJAH_DATA_DIR = dirData;

const muat = createRequire(path.join(backend, "package.json"));
const { Server } = muat("socket.io");
const { initJelajahSocket, rujukan } = muat("./src/socket/jelajah.socket.js");

rujukan.kecamatan = new Map([["cibinong", "Cibinong"]]);
rujukan.pegawai = new Set(["ahmad fauzi"]);

const server = http.createServer();
const ioServer = new Server(server);
initJelajahSocket(ioServer, { tanpaDb: true, basketDaftarMs: 400 });
await new Promise((r) => server.listen(0, r));
const alamat = `http://127.0.0.1:${server.address().port}/jelajah`;

const klien = [];
let urut = 0;
const kunciBaru = () => `uji${String(++urut).padStart(20, "0")}`;
const tunggu = (s, ev) => new Promise((r) => s.once(ev, r));
const jeda = (ms) => new Promise((r) => setTimeout(r, ms));

async function masuk(nama, ip = `10.0.0.${++urut}`, kunci = kunciBaru()) {
	const s = sambung(alamat, {
		auth: { nama, kunci },
		// bentuk asli di produksi: [karangan klien], IP klien, IP NPM
		extraHeaders: { "x-forwarded-for": `9.9.9.${urut}, ${ip}, 172.168.20.23` },
		transports: ["websocket"],
		reconnection: false,
	});
	klien.push(s);
	const selamat = await Promise.race([tunggu(s, "selamat"), tunggu(s, "connect_error").then((e) => ({ galat: e.message }))]);
	return { s, selamat };
}
const peringkat = (s) => new Promise((r) => s.emit("peringkat", null, r));

const uji = [];
const tes = (nama, f) => uji.push([nama, f]);

tes("nama jabatan & pegawai diganti Tamu, nama biasa tetap", async () => {
	for (const n of ["Bupati Bogor", "Ahmad Fauzi", "si anjing"]) {
		const { selamat } = await masuk(n);
		assert.equal(selamat.nama, "Tamu", n);
		assert.equal(selamat.namaDitolak, true, n);
	}
	const { selamat } = await masuk("Kang Ujang");
	assert.equal(selamat.nama, "Kang Ujang");
	assert.equal(selamat.namaDitolak, false);
});

tes("chat kasar disensor untuk tamu lain", async () => {
	const { s } = await masuk("Pengirim");
	const dapat = tunggu(s, "ucap");
	s.emit("ucap", { teks: "dasar 4nj1ng kamu" });
	assert.equal((await dapat).teks, "dasar ****** kamu");
});

tes("nama sama, perangkat beda: catatan tidak saling menimpa", async () => {
	const a = await masuk("Kembar");
	a.s.emit("skor", { level: 40, xp: 9000, kg: 10, jenis: 5 });
	await jeda(50);
	const b = await masuk("Kembar");
	b.s.emit("skor", { level: 1, xp: 0, kg: 1, jenis: 1 });
	await jeda(50);
	const rows = (await peringkat(a.s)).level.filter((c) => c.nama === "Kembar");
	assert.deepEqual(rows.map((c) => c.level).sort((x, y) => y - x), [40, 1]);
});

tes("level di peringkat tidak bisa turun", async () => {
	const kunci = kunciBaru();
	const a = await masuk("Naik Turun", undefined, kunci);
	a.s.emit("skor", { level: 30, xp: 500 });
	await jeda(50);
	a.s.emit("skor", { level: 2, xp: 10 });
	await jeda(50);
	assert.equal((await peringkat(a.s)).level.find((c) => c.nama === "Naik Turun").level, 30);
});

tes("peringkat kecamatan hanya memuat kecamatan nyata, tanpa balap", async () => {
	const { s } = await masuk("Pembangun");
	s.emit("skor", { level: 1, kec: { Cibinong: 3, "Kecamatan Karangan": 4 } });
	await jeda(50);
	const p = await peringkat(s);
	assert.deepEqual(p.kecamatan, [{ nama: "Cibinong", nilai: 3, pemain: 1 }]);
	assert.equal("balap" in p, false);
});

tes("catatan lama berkunci nama diambil alih sekali", async () => {
	// berkas lama dimuat saat modul dibaca; di sini cukup dipastikan tanpa kunci tetap tercatat per nama
	const s = sambung(alamat, { auth: { nama: "Klien Lama" }, transports: ["websocket"], reconnection: false, extraHeaders: { "x-forwarded-for": "10.9.9.9" } });
	klien.push(s);
	await tunggu(s, "selamat");
	s.emit("skor", { level: 7 });
	await jeda(50);
	const baru = await masuk("Klien Lama");
	baru.s.emit("skor", { level: 2 });
	await jeda(50);
	const rows = (await peringkat(baru.s)).level.filter((c) => c.nama === "Klien Lama");
	assert.deepEqual(rows.map((c) => c.level), [7]);
});

tes("tiga laporan dari jaringan berbeda membatasi chat, IP tidak tertulis mentah", async () => {
	const ipPelaku = "10.77.0.1";
	await new Promise((r) => {
		for (const s of klien.splice(0)) s.disconnect();
		setTimeout(r, 100);
	});
	const pelaku = await masuk("Pelaku", ipPelaku);
	const a = await masuk("Pelapor A", "10.77.0.2");
	const b = await masuk("Pelapor B", "10.77.0.3");
	const c = await masuk("Pelapor C", "10.77.0.4");
	const terkirim = tunggu(pelaku.s, "ucap");
	pelaku.s.emit("ucap", { teks: "halo semua" });
	await terkirim;
	for (const p of [a, b, c]) p.s.emit("lapor", { ke: pelaku.selamat.id });
	await jeda(100);
	const ditolak = tunggu(pelaku.s, "ditolak");
	pelaku.s.emit("ucap", { teks: "lagi" });
	assert.match((await ditolak).alasan, /dibatasi/);
	const log = fs.readFileSync(path.join(dirData, "laporan.jsonl"), "utf8");
	assert.equal(log.trim().split("\n").length, 3);
	assert.equal(log.includes(ipPelaku), false);
	assert.equal(JSON.parse(log.split("\n")[0]).ucapan[0].teks, "halo semua");
});

tes("laporan tidak bisa membisukan satu jaringan sendiri", async () => {
	const ip = "10.78.0.1";
	const pelaku = await masuk("Sejaringan", ip);
	for (const n of ["S1", "S2", "S3"]) (await masuk(n, ip)).s.emit("lapor", { ke: pelaku.selamat.id });
	await jeda(100);
	const dapat = tunggu(pelaku.s, "ucap");
	pelaku.s.emit("ucap", { teks: "masih bisa" });
	assert.equal((await dapat).teks, "masih bisa");
});

tes("gotong royong tersiar ke semua", async () => {
	const a = await masuk("Gotong A");
	const b = await masuk("Gotong B");
	const awal = b.selamat.gotong.jumlah;
	assert.equal(b.selamat.gotong.target, 9);
	const dapat = tunggu(b.s, "gotong");
	a.s.emit("gotong");
	assert.equal((await dapat).jumlah, awal + 1);
});

tes("tamu di kecamatan yang sama sekamar", async () => {
	await new Promise((r) => {
		for (const s of klien.splice(0)) s.disconnect();
		setTimeout(r, 100);
	});
	const a = await masuk("Kec A");
	const b = await masuk("Kec B");
	const tibaA = tunggu(a.s, "selamat");
	a.s.emit("pindah", { kec: "Cibinong" });
	await tibaA;
	const tiba = tunggu(a.s, "masuk");
	b.s.emit("pindah", { kec: "Cibinong" });
	assert.equal((await tiba).nama, "Kec B");
});

tes("batas per IP tidak bisa ditembus dengan memalsukan X-Forwarded-For", async () => {
	await new Promise((r) => {
		for (const s of klien.splice(0)) s.disconnect();
		setTimeout(r, 100);
	});
	const ip = "10.80.0.1";
	const hasil = [];
	for (let i = 0; i < 21; i++) hasil.push((await masuk(`Banjir ${i}`, ip)).selamat);
	assert.equal(hasil.filter((h) => !h.galat).length, 20);
	assert.equal(hasil.at(-1).galat, "terlalu-banyak");
});

// --- lomba basket antar-tamu ---
const bersih = () =>
	new Promise((r) => {
		const lama = klien.splice(0);
		for (const s of lama) s.emit("basket:keluar");
		// server mengabaikan paket yang tiba bersamaan dengan pemutusan
		setTimeout(() => {
			for (const s of lama) s.disconnect();
			setTimeout(r, 100);
		}, 100);
	});
const daftarBasket = (s) => new Promise((r) => s.emit("basket:daftar", null, r));
// keadaan lomba terbaru milik klien ini; sampai(f) menunggu pesan yang memenuhi f
function pantauBasket(s) {
	const p = { kini: null, ev: [] };
	s.on("basket", (m) => {
		p.kini = m;
		if (m?.ev) p.ev.push(m.ev);
	});
	p.sampai = async (f, ms = 8000) => {
		const akhir = Date.now() + ms;
		while (Date.now() < akhir) {
			if (f(p.kini)) return p.kini;
			await jeda(20);
		}
		throw new Error(`keadaan basket tidak tercapai, terakhir: ${JSON.stringify(p.kini)?.slice(0, 300)}`);
	};
	return p;
}
const gerakKe = (s, x, z, lain = {}) => s.emit("gerak", { x, y: 0, z, rot: 0, ...lain });
const regu = async (n) => {
	const hasil = [];
	for (let i = 0; i < n; i++) {
		const m = await masuk(`Pemain ${i + 1}`);
		hasil.push({ ...m, p: pantauBasket(m.s) });
	}
	return hasil;
};

tes("basket: enam tamu langsung 3 lawan 3 tanpa NPC, tamu ketujuh ditolak", async () => {
	await bersih();
	const r = await regu(7);
	for (const t of r.slice(0, 6)) assert.equal((await daftarBasket(t.s)).ok, true);
	const m = await r[0].p.sampai((k) => k?.fase === "mulai");
	assert.equal(m.peserta.length, 6);
	assert.deepEqual([0, 1].map((t) => m.peserta.filter((p) => p.tim === t).length), [3, 3]);
	assert.ok(m.peserta.every((p) => p.sid && p.nama.startsWith("Pemain")), "semua peserta tamu sungguhan");
	const tolak = await daftarBasket(r[6].s);
	assert.equal(tolak.ok, false);
});

tes("basket: dua tamu bertanding tanpa NPC, satu tamu kembali lawan warga", async () => {
	await bersih();
	const [a, b] = await regu(2);
	const daftarA = await daftarBasket(a.s);
	await daftarBasket(b.s);
	const m = await a.p.sampai((k) => k?.fase === "mulai");
	assert.equal(m.peserta.length, 2);
	assert.notEqual(m.peserta[0].tim, m.peserta[1].tim);
	assert.ok(m.peserta.some((p) => p.pid === daftarA.pid));
	await bersih();
	const [c] = await regu(1);
	const daftarC = await daftarBasket(c.s);
	const sendiri = await c.p.sampai((k) => k?.fase === "sendiri");
	assert.equal(sendiri.pid, daftarC.pid);
});

tes("basket: tiga tamu dibagi 2 lawan 1, penonton di ruang yang sama melihat laga", async () => {
	await bersih();
	const r = await regu(4);
	for (const t of r.slice(0, 3)) await daftarBasket(t.s);
	const m = await r[3].p.sampai((k) => k?.fase === "mulai");
	assert.deepEqual([0, 1].map((t) => m.peserta.filter((p) => p.tim === t).length), [2, 1]);
});

tes("basket: rebut bola loncat, oper, cetak angka dengan asis, aksi tidak sah diabaikan, lawan keluar = WO", async () => {
	await bersih();
	const r = await regu(4);
	const pid = new Map();
	for (const t of r) pid.set((await daftarBasket(t.s)).pid, t);
	const mulai = await r[0].p.sampai((k) => k?.fase === "mulai");
	const tim = [0, 1].map((n) => mulai.peserta.filter((p) => p.tim === n));
	const [a, b] = tim[0].map((p) => pid.get(p.pid));
	const [c, d] = tim[1].map((p) => pid.get(p.pid));
	const [pa, pb] = tim[0].map((p) => p.pid);
	// tim 0 merapat ke bola tengah, tim 1 menjauh: bola loncat pasti jatuh ke tim 0
	const jaga = setInterval(() => {
		gerakKe(c.s, -63, 26);
		gerakKe(d.s, -53, 26);
	}, 90);
	gerakKe(a.s, -58, 19);
	gerakKe(b.s, -58, 13);
	const pegang = await r[0].p.sampai((k) => k?.fase === "main" && k.pemegang === pa);
	assert.ok(pegang.jam > 13000, "waktu serang baru");
	// bukan pemegang: tembakan & operan diabaikan
	b.s.emit("basket:tembak", { isi: 0.79 });
	await jeda(100);
	assert.equal(r[0].p.kini.pemegang, pa);
	a.s.emit("basket:oper", { ke: pb });
	await r[0].p.sampai((k) => k?.pemegang === pb);
	assert.ok(r[0].p.ev.some((e) => e.k === "oper" && e.titik.length === 2));
	// b sudah dekat ring (d = 1,45 m): layup hampir selalu masuk; tembak ulang bila meleset
	let coba = 0;
	for (; coba < 12 && r[0].p.kini.skor[0] === 0; coba++) {
		if (r[0].p.kini.pemegang !== pb) {
			gerakKe(a.s, -63, 13);
			await r[0].p.sampai((k) => k?.fase === "main" && (k.pemegang === pb || k.bola), 4000);
			await jeda(1200);
			gerakKe(b.s, r[0].p.kini.bola?.x ?? -58, r[0].p.kini.bola?.z ?? 13);
			await r[0].p.sampai((k) => k?.pemegang === pb, 4000).catch(() => {});
			gerakKe(b.s, -58, 13);
			await jeda(120);
		}
		b.s.emit("basket:tembak", { isi: 0.79, x: -58, z: 13 });
		await jeda(1200);
	}
	const skor = await r[0].p.sampai((k) => k?.skor[0] >= 2);
	assert.equal(skor.peserta.find((p) => p.pid === pb).poin, skor.skor[0]);
	const cetak = r[0].p.ev.find((e) => e.k === "skor");
	assert.equal(cetak.tim, 0);
	if (coba === 1) assert.equal(cetak.asisten, pa, "operan langsung jadi angka = asis");
	// setelah gol bola menunggu di bawah ring: tidak melompat ke tangan tim 1 yang masih jauh
	const lanjut = await r[0].p.sampai((k) => k?.fase === "main" && k.hak === 1);
	assert.equal(lanjut.pemegang, null, "bola tidak pindah ke tangan");
	assert.ok(Math.hypot(lanjut.bola.x + 58, lanjut.bola.z - 11.45) < 1, "bola di bawah ring");
	// tim pencetak tidak boleh menyerobot
	gerakKe(b.s, lanjut.bola.x, lanjut.bola.z);
	await jeda(400);
	assert.equal(r[0].p.kini.pemegang, null, "tim pencetak tidak bisa mengambil");
	gerakKe(b.s, -63, 20);
	clearInterval(jaga);
	await jeda(100);
	gerakKe(c.s, lanjut.bola.x, lanjut.bola.z);
	const ambil = await r[0].p.sampai((k) => k?.pemegang);
	assert.equal(ambil.peserta.find((p) => p.pid === ambil.pemegang).tim, 1, "tim yang kebobolan mengambil bola sendiri");
	c.s.emit("basket:keluar");
	d.s.emit("basket:keluar");
	const usai = await r[0].p.sampai((k) => k?.fase === "selesai");
	assert.equal(usai.menang, 0);
	assert.equal(usai.wo, true);
	assert.ok(tim[0].some((p) => p.pid === usai.mvp), "MVP dari tim pemenang");
});

tes("basket: putus sesaat kembali ke kursinya, bola dilepas selama putus", async () => {
	await bersih();
	const kunci = kunciBaru();
	const a = await masuk("Putus", undefined, kunci);
	const pa = pantauBasket(a.s);
	const b = await masuk("Tetap");
	const pb = pantauBasket(b.s);
	const { pid } = await daftarBasket(a.s);
	await daftarBasket(b.s);
	await pb.sampai((k) => k?.fase === "mulai");
	gerakKe(a.s, -58, 19);
	gerakKe(b.s, -63, 26);
	await pa.sampai((k) => k?.pemegang === pid);
	a.s.disconnect();
	const putus = await pb.sampai((k) => k?.peserta.find((p) => p.pid === pid)?.putus);
	assert.equal(putus.pemegang, null);
	assert.ok(putus.bola, "bola lepas di lapangan");
	const lagi = await masuk("Putus", undefined, kunci);
	assert.equal(lagi.selamat.basket?.id, putus.id, "tersambung ulang melihat lomba yang sama");
	const balik = await pb.sampai((k) => !k?.peserta.find((p) => p.pid === pid)?.putus);
	assert.equal(balik.peserta.find((p) => p.pid === pid).sid, lagi.selamat.id);
});

tes("basket: tidak bisa didaftarkan dari dunia kecamatan", async () => {
	await bersih();
	const { s } = await masuk("Di Desa");
	s.emit("pindah", { kec: "Cibinong" });
	await tunggu(s, "selamat");
	const r = await daftarBasket(s);
	assert.equal(r.ok, false);
});

let gagal = 0;
for (const [nama, f] of uji) {
	try {
		await f();
		console.log(`ok   ${nama}`);
	} catch (e) {
		gagal++;
		console.error(`GAGAL ${nama}\n  ${e.message}`);
	}
}
for (const s of klien) s.disconnect();
ioServer.close();
fs.rmSync(dirData, { recursive: true, force: true });
console.log(`${uji.length - gagal}/${uji.length} lulus`);
process.exit(gagal ? 1 : 0);
