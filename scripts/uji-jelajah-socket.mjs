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
initJelajahSocket(ioServer, { tanpaDb: true });
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
