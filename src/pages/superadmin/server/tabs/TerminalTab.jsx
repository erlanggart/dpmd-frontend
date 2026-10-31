// Tab Terminal — konsol perintah bergaya shell untuk superadmin.
//
// Ini BUKAN shell server: setiap perintah dipetakan ke endpoint Manajemen
// Server yang sudah ada (dan sudah dijaga role superadmin + jejak audit di
// backend). Jadi yang bisa dilakukan di sini sama persis dengan tombol di tab
// lain, hanya lebih cepat: blokir IP, restart PM2, whois, baca log, nyalakan/
// reboot container Proxmox, dll. Aksi berisiko meminta konfirmasi.
//
// Fitur: riwayat (↑/↓, tersimpan), autocomplete Tab (perintah, nama proses,
// VMID, sumber log), Ctrl+L bersihkan, Ctrl+C batalkan.

import React, { useCallback, useEffect, useRef, useState } from "react";
import api from "../../../../api";
import { formatAngka, formatBytes, formatDurasi, pesanError } from "../serverUi";

const B = "/superadmin/server";
const KUNCI_RIWAYAT = "dpmd.kali.history";

const PANJI = String.raw`
 ____  ____  __  __ ____       ___  ____  ____
|  _ \|  _ \|  \/  |  _ \     / _ \|  _ \/ ___|
| | | | |_) | |\/| | | | |   | | | | |_) \___ \
| |_| |  __/| |  | | |_| |   | |_| |  __/ ___) |
|____/|_|   |_|  |_|____/     \___/|_|   |____/
`;

const pad = (s, n) => {
	const t = String(s ?? "");
	return t.length >= n ? `${t.slice(0, n - 1)}…` : t + " ".repeat(n - t.length);
};

/** Tabel teks rata kiri. kolom = [{ k, l, w }] */
const tabelTeks = (baris, kolom) => {
	const kepala = kolom.map((c) => pad(c.l, c.w)).join(" ");
	const garis = kolom.map((c) => "─".repeat(c.w - 1)).join(" ─");
	return [kepala, garis, ...baris.map((b) => kolom.map((c) => pad(typeof c.k === "function" ? c.k(b) : b[c.k], c.w)).join(" "))].join("\n");
};

/** "30m" | "2h" | "1d" | "perm" → menit (null = permanen) */
const parseDurasi = (s) => {
	if (!s) return 1440;
	if (/^(perm|permanen|forever)$/i.test(s)) return null;
	const m = String(s).match(/^(\d+)\s*([mhd])?$/i);
	if (!m) return undefined;
	const n = Number(m[1]);
	const u = (m[2] || "m").toLowerCase();
	return u === "d" ? n * 1440 : u === "h" ? n * 60 : n;
};

const TAB_ALIAS = {
	map: "peta-ancaman",
	peta: "peta-ancaman",
	ringkasan: "ringkasan",
	overview: "ringkasan",
	apps: "aplikasi",
	pve: "semua-aplikasi",
	proxmox: "semua-aplikasi",
	storage: "storage",
	db: "database",
	database: "database",
	security: "keamanan",
	keamanan: "keamanan",
	traffic: "trafik",
	trafik: "trafik",
	log: "log",
	logs: "log",
	settings: "pengaturan",
	pengaturan: "pengaturan",
};

/* ───────────────────────── Daftar perintah ───────────────────────── */

const PERINTAH = {
	help: {
		ringkas: "daftar perintah",
		jalankan: async (_a, io) => {
			const daftar = Object.entries(PERINTAH)
				.filter(([, v]) => !v.alias)
				.map(([k, v]) => `  ${pad(v.pakai || k, 38)}${v.ringkas}`);
			io.cetak(["Perintah tersedia:", ...daftar, "", "Tips: Tab = lengkapi, ↑/↓ = riwayat, Ctrl+L = bersihkan, Ctrl+C = batal."].join("\n"));
		},
	},
	clear: { ringkas: "bersihkan layar", jalankan: async (_a, io) => io.bersihkan() },
	cls: { alias: true, jalankan: async (_a, io) => io.bersihkan() },

	whoami: {
		ringkas: "akun & IP Anda",
		jalankan: async (_a, io) => {
			const res = await api.get(`${B}/config`);
			let nama = "superadmin";
			try {
				const u = JSON.parse(localStorage.getItem("user") || "null");
				if (u?.name) nama = `${u.name} <${u.email || "-"}> (${u.role || "superadmin"})`;
			} catch {
				/* abaikan */
			}
			io.cetak(`${nama}\nip: ${res.data?.data?.your_ip || "-"}`);
		},
	},

	neofetch: {
		ringkas: "info server lengkap",
		jalankan: async (_a, io) => {
			const d = (await api.get(`${B}/overview`)).data?.data;
			const s = d.system;
			const l = d.latest || {};
			const info = [
				`root@${s.hostname}`,
				"─".repeat(28),
				`OS       : ${s.distro}`,
				`Kernel   : ${s.kernel} (${s.arch})`,
				`Uptime   : ${formatDurasi(s.os_uptime)}`,
				`CPU      : ${s.cpu_model} × ${s.cpu_cores}`,
				`Beban    : ${l.cpu ?? "-"}% · load ${(l.load || []).join(" ")}`,
				`Memori   : ${formatBytes(l.memory?.used)} / ${formatBytes(l.memory?.total)} (${l.memory?.percent ?? "-"}%)`,
				`Disk     : ${l.disk ? `${formatBytes(l.disk.used)} / ${formatBytes(l.disk.total)} (${l.disk.percent}%)` : "-"}`,
				`Jaringan : ↓ ${formatBytes(l.network?.rx_rate)}/s ↑ ${formatBytes(l.network?.tx_rate)}/s`,
				`Node     : ${s.node_version} · pid ${l.process?.pid ?? "-"}`,
				`PM2      : ${d.apps.online}/${d.apps.total} online`,
				`Database : ${d.database?.connected ? `terhubung ${d.database.latency_ms} ms` : "TERPUTUS"}`,
				`Trafik   : ${d.traffic.rpm} req/mnt · p95 ${d.traffic.p95 ?? "-"} ms`,
				`Peringatan: ${d.alerts.length ? d.alerts.map((a) => a.title).join("; ") : "tidak ada"}`,
			];
			const panji = PANJI.split("\n").filter(Boolean);
			io.cetak(panji.join("\n"), "neon");
			io.cetak(info.join("\n"));
		},
	},
	status: { alias: true, jalankan: (a, io) => PERINTAH.neofetch.jalankan(a, io) },

	top: {
		ringkas: "proses PM2",
		jalankan: async (_a, io) => {
			const d = (await api.get(`${B}/overview`)).data?.data;
			if (!d.apps.pm2_available) return io.cetak("PM2 tidak tersedia di server ini.", "warn");
			io.cetak(
				tabelTeks(d.apps.processes, [
					{ k: "name", l: "NAMA", w: 26 },
					{ k: "status", l: "STATUS", w: 10 },
					{ k: (p) => `${p.cpu}%`, l: "CPU", w: 7 },
					{ k: (p) => formatBytes(p.memory), l: "MEM", w: 10 },
					{ k: "restarts", l: "↺", w: 6 },
					{ k: (p) => (p.is_self ? "← panel ini" : ""), l: "", w: 12 },
				]),
			);
			return undefined;
		},
	},
	ps: { alias: true, jalankan: (a, io) => PERINTAH.top.jalankan(a, io) },

	pm2: {
		pakai: "pm2 <restart|reload|stop|start|logs> <nama>",
		ringkas: "kendalikan proses PM2",
		jalankan: async ([aksi, nama, n], io) => {
			if (!aksi || !nama) return io.cetak("pakai: pm2 <restart|reload|stop|start|logs> <nama> [baris]", "warn");
			if (aksi === "logs") {
				const d = (await api.get(`${B}/apps/pm2/${encodeURIComponent(nama)}/logs`, { params: { lines: Number(n) || 40 } })).data?.data;
				io.cetak(`==> ${nama}-out.log <==`, "neon");
				io.cetak((d.out?.lines || []).join("\n") || "(kosong)");
				io.cetak(`==> ${nama}-error.log <==`, "err");
				io.cetak((d.error?.lines || []).join("\n") || "(kosong)");
				return undefined;
			}
			if (!["restart", "reload", "stop", "start"].includes(aksi)) return io.cetak(`aksi tidak dikenal: ${aksi}`, "err");
			if (aksi === "stop" || aksi === "restart") {
				const j = await io.tanya(`${aksi} proses "${nama}"? aplikasi bisa terputus sejenak [y/N]`);
				if (!/^y(a|es)?$/i.test(j)) return io.cetak("dibatalkan.", "warn");
			}
			io.cetak(`[*] pm2 ${aksi} ${nama} …`, "dim");
			const r = await api.post(`${B}/apps/pm2/${encodeURIComponent(nama)}/${aksi}`);
			io.cetak(`[+] ${r.data?.message || "selesai"}`, "ok");
			return undefined;
		},
	},

	services: {
		ringkas: "layanan systemd",
		jalankan: async (_a, io) => {
			const d = (await api.get(`${B}/apps`)).data?.data;
			if (!d.services?.available) return io.cetak(d.services?.note || "Tidak tersedia.", "warn");
			io.cetak(
				tabelTeks(d.services.services, [
					{ k: "unit", l: "UNIT", w: 24 },
					{ k: (s) => `${s.active}/${s.sub}`, l: "STATUS", w: 20 },
					{ k: (s) => (s.memory ? formatBytes(s.memory) : "-"), l: "MEM", w: 10 },
					{ k: "label", l: "KETERANGAN", w: 30 },
				]),
			);
			return undefined;
		},
	},

	netstat: {
		ringkas: "port yang mendengarkan",
		jalankan: async (_a, io) => {
			const d = (await api.get(`${B}/apps`)).data?.data;
			if (!d.ports?.available) return io.cetak(d.ports?.note || "Tidak tersedia (hanya Linux).", "warn");
			io.cetak(
				tabelTeks(d.ports.ports, [
					{ k: "port", l: "PORT", w: 8 },
					{ k: "address", l: "ALAMAT", w: 18 },
					{ k: "process", l: "PROSES", w: 22 },
					{ k: (p) => (p.public ? "PUBLIK" : "lokal"), l: "AKSES", w: 8 },
				]),
			);
			return undefined;
		},
	},
	ports: { alias: true, jalankan: (a, io) => PERINTAH.netstat.jalankan(a, io) },

	df: {
		ringkas: "disk & kuota storage",
		jalankan: async (_a, io) => {
			const d = (await api.get(`${B}/storage`)).data?.data;
			if (d.disk) io.cetak(`/ : ${formatBytes(d.disk.used)} / ${formatBytes(d.disk.total)} (${d.disk.percent}%) · bebas ${formatBytes(d.disk.free)}`);
			if (Array.isArray(d.partitions) && d.partitions.length) {
				io.cetak(
					tabelTeks(d.partitions, [
						{ k: (p) => p.mount || p.target || p.fs, l: "MOUNT", w: 22 },
						{ k: (p) => formatBytes(p.total), l: "TOTAL", w: 10 },
						{ k: (p) => formatBytes(p.used), l: "PAKAI", w: 10 },
						{ k: (p) => `${p.percent ?? "-"}%`, l: "%", w: 7 },
					]),
				);
			}
			(d.folders || []).forEach((f) => io.cetak(`  ${pad(f.label, 30)} ${pad(formatBytes(f.size), 10)} ${formatAngka(f.files)} berkas`));
			if (d.quota) io.cetak(`kuota: ${d.quota.quota_gb ? `${d.quota.percent ?? 0}% dari ${d.quota.quota_gb} GB` : "tanpa batas"}`, "dim");
			return undefined;
		},
	},

	db: {
		ringkas: "status database MySQL",
		jalankan: async (_a, io) => {
			const d = (await api.get(`${B}/database`)).data?.data;
			if (!d.connected) return io.cetak(`DATABASE TERPUTUS: ${d.error || "-"}`, "err");
			io.cetak(
				[
					`${d.version} · db ${d.name} · latensi ${d.latency_ms} ms · aktif ${formatDurasi(d.uptime)}`,
					`koneksi ${d.connections.current}/${d.connections.max ?? "?"} (puncak ${d.connections.max_used}) · berjalan ${d.connections.running}`,
					`query ${formatAngka(d.queries.total)} · ${d.queries.qps}/dtk · lambat ${d.queries.slow}`,
					`ukuran ${formatBytes(d.size?.total)} · ${d.size?.tables} tabel · ${formatAngka(d.size?.rows)} baris`,
					"",
					"tabel terbesar:",
					...d.tables.slice(0, 8).map((t) => `  ${pad(t.name, 40)} ${pad(formatBytes(t.total_size), 10)} ~${formatAngka(t.row_estimate)} baris`),
				].join("\n"),
			);
			return undefined;
		},
	},

	traffic: {
		ringkas: "statistik trafik HTTP",
		jalankan: async (_a, io) => {
			const d = (await api.get(`${B}/traffic`)).data?.data;
			io.cetak(`total ${formatAngka(d.total)} req sejak ${new Date(d.since).toLocaleString("id-ID")} · ${d.rpm} req/mnt · p50 ${d.p50} ms · p95 ${d.p95} ms · p99 ${d.p99} ms`);
			io.cetak(tabelTeks(d.top_routes.slice(0, 10), [{ k: "route", l: "RUTE", w: 46 }, { k: "count", l: "REQ", w: 9 }, { k: "avg_ms", l: "AVG ms", w: 8 }, { k: "errors", l: "ERR", w: 6 }]));
			io.cetak(tabelTeks(d.top_ips.slice(0, 8), [{ k: "ip", l: "IP TERATAS", w: 40 }, { k: "count", l: "REQ", w: 9 }, { k: "errors", l: "ERR", w: 6 }]));
		},
	},

	threats: {
		ringkas: "ringkasan ancaman 24 jam",
		jalankan: async ([r], io) => {
			const d = (await api.get(`${B}/security/summary`, { params: { range: r || "24h" } })).data?.data;
			const warna = { aman: "ok", waspada: "warn", tinggi: "err", kritis: "err" }[d.threat_level] || "out";
			io.cetak(`THREAT LEVEL: ${d.threat_level.toUpperCase()} · ${d.last_hour} kejadian/jam terakhir · ${d.blocked_count} IP diblokir`, warna);
			io.cetak(`${formatAngka(d.total)} kejadian dari ${d.unique_ips} IP (${d.range}) · kritis ${d.by_severity.critical} · tinggi ${d.by_severity.high} · sedang ${d.by_severity.medium}`);
			io.cetak(
				tabelTeks(d.top_ips.slice(0, 12), [
					{ k: "ip_address", l: "IP", w: 40 },
					{ k: "n", l: "N", w: 7 },
					{ k: "serius", l: "SERIUS", w: 7 },
					{ k: "score", l: "SKOR", w: 6 },
					{ k: (b) => (b.blocked ? "DIBLOKIR" : ""), l: "", w: 9 },
					{ k: (b) => b.types.join(","), l: "JENIS", w: 34 },
				]),
			);
		},
	},

	events: {
		pakai: "events [n] [critical|high|medium|low]",
		ringkas: "kejadian keamanan terbaru",
		jalankan: async ([n, sev], io) => {
			const res = await api.get(`${B}/security/events`, { params: { limit: Math.min(100, Number(n) || 20), severity: sev || undefined, range: "7d", geo: "1" } });
			const data = res.data?.data || [];
			if (!data.length) return io.cetak("tidak ada kejadian.", "dim");
			data.forEach((e) => {
				const jenis = { critical: "err", high: "err", medium: "warn" }[e.severity] || "dim";
				io.cetak(`${new Date(e.created_at).toLocaleString("id-ID")}  ${pad(e.severity.toUpperCase(), 9)}${pad(e.ip_address, 40)}${pad(e.geo?.cc || "··", 4)}${e.label}  ${e.path || e.detail || ""}`, jenis);
			});
			return undefined;
		},
	},

	whois: {
		pakai: "whois <ip>",
		ringkas: "lokasi, ISP & riwayat IP",
		jalankan: async ([ip], io) => {
			if (!ip) return io.cetak("pakai: whois <ip>", "warn");
			io.cetak(`[*] menelusuri ${ip} …`, "dim");
			const d = (await api.get(`${B}/security/geo/${encodeURIComponent(ip)}`)).data?.data;
			const g = d.geo;
			io.cetak(
				[
					`ip        : ${d.ip}${d.private ? " (internal)" : ""}${d.whitelisted ? " (whitelist)" : ""}`,
					`lokasi    : ${g ? [g.city, g.region, g.country].filter(Boolean).join(", ") || "-" : d.private ? "jaringan internal" : "belum diketahui (coba lagi sebentar)"}`,
					`negara    : ${g?.cc || "-"}`,
					`isp / asn : ${g?.isp || "-"} / ${g?.asn || "-"}`,
					`org       : ${g?.org || "-"}`,
					`koordinat : ${g?.lat != null ? `${g.lat}, ${g.lon}` : "-"}`,
					`penanda   : ${[g?.hosting && "hosting/VPS", g?.proxy && "proxy/VPN/Tor"].filter(Boolean).join(", ") || "-"}`,
					`skor      : ${d.score}`,
					`30 hari   : ${d.events_30d} kejadian${d.types.length ? ` (${d.types.join(", ")})` : ""}`,
					`status    : ${d.blocked ? `DIBLOKIR — ${d.blocked.reason || ""}${d.blocked.expires_at ? ` s/d ${new Date(d.blocked.expires_at).toLocaleString("id-ID")}` : " (permanen)"}` : "terbuka"}`,
				].join("\n"),
				d.blocked ? "err" : "out",
			);
			return undefined;
		},
	},
	geo: { alias: true, jalankan: (a, io) => PERINTAH.whois.jalankan(a, io) },

	block: {
		pakai: "block <ip> [30m|2h|1d|perm] [alasan]",
		ringkas: "blokir IP (bawaan 1 hari)",
		jalankan: async ([ip, dur, ...alasan], io) => {
			if (!ip) return io.cetak("pakai: block <ip> [30m|2h|1d|perm] [alasan]", "warn");
			const menit = parseDurasi(dur);
			if (menit === undefined) return io.cetak(`durasi tidak dikenal: ${dur} (contoh: 30m, 2h, 1d, perm)`, "err");
			const r = await api.post(`${B}/security/blocklist`, { ip, minutes: menit, reason: alasan.join(" ") || "Diblokir dari Terminal" });
			io.cetak(`[+] ${r.data?.message} ${menit ? `selama ${formatDurasi(menit * 60)}` : "PERMANEN"}`, "ok");
			return undefined;
		},
	},
	unblock: {
		pakai: "unblock <ip>",
		ringkas: "buka blokir IP",
		jalankan: async ([ip], io) => {
			if (!ip) return io.cetak("pakai: unblock <ip>", "warn");
			const r = await api.delete(`${B}/security/blocklist/${encodeURIComponent(ip)}`);
			io.cetak(`[+] ${r.data?.message}`, "ok");
			return undefined;
		},
	},
	blocklist: {
		ringkas: "daftar IP diblokir",
		jalankan: async (_a, io) => {
			const d = ((await api.get(`${B}/security/blocklist`)).data?.data || []).filter((b) => !b.expired);
			if (!d.length) return io.cetak("tidak ada IP yang diblokir.", "dim");
			io.cetak(
				tabelTeks(d, [
					{ k: "ip_address", l: "IP", w: 40 },
					{ k: (b) => (b.auto ? "auto" : "manual"), l: "JENIS", w: 7 },
					{ k: "hits", l: "HIT", w: 7 },
					{ k: (b) => (b.expires_at ? new Date(b.expires_at).toLocaleString("id-ID") : "permanen"), l: "SAMPAI", w: 22 },
					{ k: "reason", l: "ALASAN", w: 40 },
				]),
			);
			return undefined;
		},
	},

	geoblock: {
		pakai: "geoblock [list|add <CC>|rm <CC>]",
		ringkas: "blokir negara untuk request anonim",
		jalankan: async ([aksi = "list", cc], io) => {
			const kini = (await api.get(`${B}/config`)).data?.data?.config?.security?.blocked_countries || [];
			if (aksi === "list") return io.cetak(kini.length ? `negara diblokir: ${kini.join(", ")}` : "tidak ada negara yang diblokir.");
			const kode = String(cc || "").toUpperCase();
			if (!/^[A-Z]{2}$/.test(kode)) return io.cetak("kode negara 2 huruf, mis. CN, RU, US", "err");
			let baru = kini;
			if (aksi === "add") {
				const j = await io.tanya(`tolak semua request anonim dari ${kode}? [y/N]`);
				if (!/^y(a|es)?$/i.test(j)) return io.cetak("dibatalkan.", "warn");
				baru = [...new Set([...kini, kode])];
			} else if (aksi === "rm") baru = kini.filter((x) => x !== kode);
			else return io.cetak(`aksi tidak dikenal: ${aksi}`, "err");
			await api.put(`${B}/config`, { security: { blocked_countries: baru } });
			io.cetak(`[+] geo-block: ${baru.length ? baru.join(", ") : "(kosong)"}`, "ok");
			return undefined;
		},
	},

	logs: {
		pakai: "logs [sumber] [baris] [cari…]",
		ringkas: "baca log (error, combined, deploy, nginx_error, nginx_access, auth)",
		jalankan: async ([sumber = "error", n, ...cari], io) => {
			const d = (await api.get(`${B}/logs`, { params: { source: sumber, lines: Number(n) || 50, q: cari.join(" ") || undefined } })).data?.data;
			io.cetak(`==> ${d.path} <==${d.error ? ` (${d.error})` : ""}`, "neon");
			if (!d.lines.length) return io.cetak("(kosong)", "dim");
			d.lines.forEach((b) => io.cetak(b.raw, b.level === "error" ? "err" : b.level === "warn" ? "warn" : "out"));
			return undefined;
		},
	},

	monitors: {
		ringkas: "cek uptime semua monitor sekarang",
		jalankan: async (_a, io) => {
			io.cetak("[*] memeriksa…", "dim");
			const d = (await api.post(`${B}/monitors/check`)).data?.data || [];
			d.forEach((m) =>
				io.cetak(
					`${m.last?.up ? "[UP]  " : "[DOWN]"} ${pad(m.name, 26)} ${pad(m.last?.ms != null ? `${m.last.ms} ms` : "-", 9)} uptime ${m.uptime_percent ?? "-"}%  ${m.ssl?.days_left != null ? `ssl ${m.ssl.days_left} hari` : ""}  ${m.url}`,
					m.last?.up ? "ok" : "err",
				),
			);
		},
	},

	ct: {
		pakai: "ct [list|start|shutdown|reboot|stop <vmid>]",
		ringkas: "container/VM Proxmox",
		jalankan: async ([aksi = "list", vmid], io) => {
			if (aksi === "list") {
				const d = (await api.get(`${B}/proxmox/overview`)).data?.data;
				io.cetak(
					tabelTeks(d.guests || [], [
						{ k: "vmid", l: "VMID", w: 6 },
						{ k: "name", l: "NAMA", w: 24 },
						{ k: "type", l: "TIPE", w: 6 },
						{ k: "status", l: "STATUS", w: 9 },
						{ k: (g) => `${g.cpu}%`, l: "CPU", w: 7 },
						{ k: (g) => `${formatBytes(g.mem)}/${formatBytes(g.maxmem)}`, l: "MEM", w: 20 },
						{ k: (g) => (g.is_self ? "← panel" : g.protected ? "terlindungi" : ""), l: "", w: 12 },
					]),
				);
				return undefined;
			}
			if (!["start", "shutdown", "reboot", "stop"].includes(aksi) || !vmid) return io.cetak("pakai: ct <start|shutdown|reboot|stop> <vmid>", "warn");
			const g = (await api.get(`${B}/proxmox/guests/${encodeURIComponent(vmid)}`)).data?.data;
			let konfirmasi = "";
			if (aksi !== "start") {
				io.cetak(`!! ${aksi} ${g.type} ${g.vmid} "${g.name}" — layanan di dalamnya akan berhenti.`, "err");
				konfirmasi = await io.tanya(`ketik nama "${g.name}" untuk konfirmasi`);
				if (konfirmasi.trim() !== String(g.name)) return io.cetak("nama tidak cocok — dibatalkan.", "warn");
			}
			const r = await api.post(`${B}/proxmox/guests/${encodeURIComponent(vmid)}/power/${aksi}`, { confirm_name: konfirmasi.trim() });
			io.cetak(`[+] ${r.data?.message}`, "ok");
			return undefined;
		},
	},

	cleanup: {
		ringkas: "pratinjau berkas yang bisa dibersihkan",
		jalankan: async (_a, io) => {
			const d = (await api.get(`${B}/storage/cleanup`)).data?.data;
			const daftar = Array.isArray(d) ? d : d?.targets || Object.values(d || {});
			daftar.forEach((t) => io.cetak(`  ${pad(t.label || t.key, 36)} ${pad(formatBytes(t.size ?? t.bytes), 10)} ${formatAngka(t.files)} berkas`));
			io.cetak("Jalankan pembersihan dari tab Storage.", "dim");
		},
	},

	open: {
		pakai: "open <map|apps|pve|storage|db|security|traffic|logs|settings>",
		ringkas: "buka tab lain",
		jalankan: async ([nama], io) => {
			const tab = TAB_ALIAS[nama];
			if (!tab) return io.cetak(`tab tidak dikenal. pilihan: ${Object.keys(TAB_ALIAS).join(", ")}`, "warn");
			io.bukaTab(tab);
			return undefined;
		},
	},

	history: {
		ringkas: "riwayat perintah",
		jalankan: async (_a, io) => io.cetak(io.riwayat().map((r, i) => `${pad(i + 1, 5)}${r}`).join("\n") || "(kosong)"),
	},

	date: { ringkas: "waktu server", jalankan: async (_a, io) => io.cetak(new Date((await api.get(`${B}/overview`)).data?.data?.server_time).toString()) },
};

const WARNA_BARIS = {
	in: "text-slate-800",
	out: "text-slate-700",
	ok: "text-emerald-600",
	warn: "text-amber-600",
	err: "text-red-600",
	dim: "text-slate-500",
	neon: "text-slate-900 kali-glow",
};

const sambutan = () => [
	{ jenis: "neon", teks: PANJI },
	{ jenis: "dim", teks: `DPMD Server Ops Console — ${new Date().toLocaleString("id-ID")}` },
	{ jenis: "dim", teks: 'Ketik "help" untuk daftar perintah. Semua aksi tercatat di log aktivitas.' },
	{ jenis: "out", teks: "" },
];

const TerminalTab = ({ onNavigate }) => {
	const [baris, setBaris] = useState(sambutan);
	const [masukan, setMasukan] = useState("");
	const [sibuk, setSibuk] = useState(false);
	const [tanya, setTanya] = useState(null); // { teks, resolve }
	const [riwayat, setRiwayat] = useState(() => {
		try {
			return JSON.parse(localStorage.getItem(KUNCI_RIWAYAT) || "[]");
		} catch {
			return [];
		}
	});
	const posRiwayat = useRef(-1);
	const kotak = useRef(null);
	const input = useRef(null);
	const kandidat = useRef({ pm2: [], vmid: [] });

	const cetak = useCallback((teks, jenis = "out") => setBaris((b) => [...b, { jenis, teks: String(teks) }].slice(-1500)), []);

	useEffect(() => {
		kotak.current?.scrollTo({ top: kotak.current.scrollHeight });
	}, [baris, tanya]);

	useEffect(() => {
		input.current?.focus();
		// Isi kandidat autocomplete (diam-diam; gagal tidak masalah).
		api.get(`${B}/overview`).then((r) => { kandidat.current.pm2 = (r.data?.data?.apps?.processes || []).map((p) => p.name); }).catch(() => {});
		api.get(`${B}/proxmox/overview`).then((r) => { kandidat.current.vmid = (r.data?.data?.guests || []).map((g) => String(g.vmid)); }).catch(() => {});
	}, []);

	const simpanRiwayat = (perintah) => {
		setRiwayat((r) => {
			const baru = [...r.filter((x) => x !== perintah), perintah].slice(-200);
			try {
				localStorage.setItem(KUNCI_RIWAYAT, JSON.stringify(baru));
			} catch {
				/* penyimpanan tidak tersedia */
			}
			return baru;
		});
	};

	const jalankan = async (teks) => {
		const perintah = teks.trim();
		cetak(`┌──(root㉿dpmd)-[~]\n└─# ${perintah}`, "in");
		if (!perintah) return;
		simpanRiwayat(perintah);
		posRiwayat.current = -1;
		const [nama, ...args] = perintah.split(/\s+/);
		const def = PERINTAH[nama.toLowerCase()];
		if (!def) {
			cetak(`${nama}: perintah tidak ditemukan. ketik "help".`, "err");
			return;
		}
		const io = {
			cetak,
			bersihkan: () => setBaris([]),
			riwayat: () => riwayat,
			bukaTab: (t) => onNavigate?.(t),
			tanya: (q) =>
				new Promise((resolve) => {
					setTanya({ teks: q, resolve });
				}),
		};
		setSibuk(true);
		try {
			await def.jalankan(args, io);
		} catch (e) {
			cetak(`[-] ${pesanError(e)}`, "err");
		} finally {
			setSibuk(false);
			setTimeout(() => input.current?.focus(), 0);
		}
	};

	const lengkapi = () => {
		const bagian = masukan.split(/\s+/);
		let pilihan = [];
		if (bagian.length === 1) pilihan = Object.keys(PERINTAH).filter((k) => k.startsWith(bagian[0].toLowerCase()));
		else {
			const [c] = bagian;
			const akhir = bagian[bagian.length - 1];
			const pos = bagian.length - 1;
			const sumber = {
				pm2: pos === 1 ? ["restart", "reload", "stop", "start", "logs"] : pos === 2 ? kandidat.current.pm2 : [],
				ct: pos === 1 ? ["list", "start", "shutdown", "reboot", "stop"] : pos === 2 ? kandidat.current.vmid : [],
				logs: pos === 1 ? ["error", "combined", "deploy", "nginx_error", "nginx_access", "auth"] : [],
				geoblock: pos === 1 ? ["list", "add", "rm"] : [],
				open: pos === 1 ? Object.keys(TAB_ALIAS) : [],
				events: pos === 2 ? ["critical", "high", "medium", "low"] : [],
				block: pos === 2 ? ["30m", "1h", "1d", "7d", "perm"] : [],
				threats: pos === 1 ? ["1h", "24h", "7d", "30d"] : [],
			}[c] || [];
			pilihan = sumber.filter((s) => s.startsWith(akhir));
		}
		if (pilihan.length === 1) {
			const bagianBaru = [...bagian.slice(0, -1), pilihan[0]];
			setMasukan(`${bagianBaru.join(" ")} `);
		} else if (pilihan.length > 1) {
			cetak(pilihan.join("   "), "dim");
		}
	};

	const onKey = (e) => {
		if (e.key === "Enter") {
			e.preventDefault();
			const nilai = masukan;
			setMasukan("");
			if (tanya) {
				cetak(`? ${tanya.teks} ${nilai}`, "warn");
				const r = tanya.resolve;
				setTanya(null);
				r(nilai);
				return;
			}
			if (!sibuk) jalankan(nilai);
		} else if (e.key === "Tab") {
			e.preventDefault();
			if (!tanya) lengkapi();
		} else if (e.key === "ArrowUp" && !tanya) {
			e.preventDefault();
			if (!riwayat.length) return;
			posRiwayat.current = posRiwayat.current < 0 ? riwayat.length - 1 : Math.max(0, posRiwayat.current - 1);
			setMasukan(riwayat[posRiwayat.current]);
		} else if (e.key === "ArrowDown" && !tanya) {
			e.preventDefault();
			if (posRiwayat.current < 0) return;
			posRiwayat.current += 1;
			if (posRiwayat.current >= riwayat.length) {
				posRiwayat.current = -1;
				setMasukan("");
			} else setMasukan(riwayat[posRiwayat.current]);
		} else if (e.key === "l" && e.ctrlKey) {
			e.preventDefault();
			setBaris([]);
		} else if (e.key === "c" && e.ctrlKey && !window.getSelection()?.toString()) {
			e.preventDefault();
			if (tanya) {
				const r = tanya.resolve;
				setTanya(null);
				r("");
			}
			cetak(`${masukan}^C`, "dim");
			setMasukan("");
		}
	};

	const cepat = ["neofetch", "threats", "events 15", "top", "blocklist", "ct list", "logs error 30", "monitors"];

	return (
		<div className="space-y-2">
			<div className="flex flex-wrap gap-1.5">
				{cepat.map((c) => (
					<button
						key={c}
						disabled={sibuk || !!tanya}
						onClick={() => jalankan(c)}
						className="border border-slate-200 bg-white px-2 py-1 text-[11.5px] text-slate-700 hover:border-slate-900 hover:text-slate-900 disabled:opacity-40"
					>
						$ {c}
					</button>
				))}
			</div>
			<div
				ref={kotak}
				onClick={() => !window.getSelection()?.toString() && input.current?.focus()}
				className="h-[calc(100vh-290px)] min-h-[420px] overflow-auto border border-slate-200 bg-slate-950 p-3 text-[12.5px] leading-[1.55] shadow-[inset_0_0_60px_rgba(0,255,65,0.05)]"
			>
				{baris.map((b, i) => (
					<pre key={i} className={`whitespace-pre-wrap break-words [font-family:inherit] ${WARNA_BARIS[b.jenis] || WARNA_BARIS.out}`}>
						{b.teks}
					</pre>
				))}
				<div className="flex items-start gap-2">
					<pre className={`shrink-0 [font-family:inherit] ${tanya ? "text-amber-600" : "text-slate-900"}`}>
						{tanya ? `? ${tanya.teks}` : sibuk ? "[…]" : "└─#"}
					</pre>
					<input
						ref={input}
						value={masukan}
						onChange={(e) => setMasukan(e.target.value)}
						onKeyDown={onKey}
						disabled={sibuk && !tanya}
						spellCheck={false}
						autoComplete="off"
						autoCapitalize="off"
						aria-label="Perintah terminal"
						className="min-w-0 flex-1 !border-0 !bg-transparent p-0 text-[12.5px] text-slate-800 !shadow-none outline-none"
					/>
				</div>
			</div>
		</div>
	);
};

export default TerminalTab;
