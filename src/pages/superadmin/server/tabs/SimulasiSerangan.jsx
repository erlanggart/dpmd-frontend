// Simulasi serangan siber PALSU untuk demo/latihan. Seluruhnya di sisi browser:
// tidak ada panggilan API, tidak menyentuh data keamanan nyata, tidak memblokir apa pun.
// Skenario 60 detik: recon → brute force → DDoS → eksploitasi → mitigasi.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { FiShield } from "react-icons/fi";
import { suara } from "../suaraOps";

const DURASI = 60;

const FASE = [
	{ nama: "RECON", mulai: 0, akhir: 8, laju: 3, sev: [["low", 1], ["medium", 1]], kota: 6, jenis: ["Port scan TCP 1-65535", "nmap -sV fingerprint", "GET /.env", "GET /wp-login.php", "GET /phpmyadmin/", "GET /.git/config"] },
	{ nama: "BRUTE FORCE", mulai: 8, akhir: 20, laju: 12, sev: [["high", 1]], kota: 12, login: true, jenis: ["SSH brute force root@22", "Credential stuffing POST /api/auth/login", "RDP brute force :3389", "FTP anonymous login"] },
	{ nama: "DDoS BOTNET", mulai: 20, akhir: 38, laju: 60, sev: [["high", 7], ["critical", 3]], kota: 30, jenis: ["SYN flood", "UDP amplification (DNS)", "HTTP/2 rapid reset", "Mirai botnet telnet:23", "Slowloris"] },
	{ nama: "EKSPLOITASI", mulai: 38, akhir: 50, laju: 8, sev: [["critical", 1]], kota: 8, tolak: true, jenis: ["SQL injection ' OR 1=1--", "RCE /cgi-bin/;wget", "Log4Shell ${jndi:ldap://…}", "Path traversal ../../etc/passwd", "Deserialisasi Java", "XXE upload"] },
	{ nama: "MITIGASI", mulai: 50, akhir: 60, laju: 20, turun: true, sev: [["low", 1], ["medium", 1]], kota: 30, jenis: null },
];

// [cc, nama, lat, lon] — urutan = prioritas pemakaian per fase.
const KOTA = [
	["RU", "Moskow", 55.75, 37.62], ["CN", "Beijing", 39.9, 116.4], ["KP", "Pyongyang", 39.04, 125.76], ["IR", "Teheran", 35.69, 51.39],
	["BR", "Sao Paulo", -23.55, -46.63], ["NG", "Lagos", 6.52, 3.38], ["RO", "Bukares", 44.43, 26.1], ["UA", "Kyiv", 50.45, 30.52],
	["CN", "Shenzhen", 22.54, 114.06], ["NL", "Amsterdam", 52.37, 4.9], ["DE", "Frankfurt", 50.11, 8.68], ["US", "Ashburn", 39.04, -77.49],
	["US", "Los Angeles", 34.05, -118.24], ["SG", "Singapura", 1.35, 103.82], ["VN", "Hanoi", 21.03, 105.85], ["IN", "Mumbai", 19.08, 72.88],
	["KR", "Seoul", 37.57, 126.98], ["ID", "Jakarta", -6.2, 106.85], ["TR", "Istanbul", 41.01, 28.98], ["ZA", "Johannesburg", -26.2, 28.04],
	["AR", "Buenos Aires", -34.6, -58.38], ["CA", "Toronto", 43.65, -79.38], ["AU", "Sydney", -33.87, 151.21], ["PK", "Karachi", 24.86, 67.01],
	["BD", "Dhaka", 23.81, 90.41], ["TH", "Bangkok", 13.76, 100.5], ["PH", "Manila", 14.6, 120.98], ["EG", "Kairo", 30.04, 31.24],
	["FR", "Paris", 48.86, 2.35], ["GB", "London", 51.51, -0.13], ["JP", "Tokyo", 35.68, 139.69],
];

const LOG_MITIGASI = [
	[50.5, (m) => `AUTO-BLOCK ${m.diblokir} IP`],
	[52.5, (m) => `Geo-block diaktifkan: ${[...m.negara].slice(0, 3).join(",")}`],
	[54.5, () => "Rate limit diperketat 10 req/mnt"],
	[56.5, () => "Upstream dialihkan ke scrubbing center"],
	[58, (m) => `fail2ban: ${Math.max(3, Math.round(m.diblokir / 40))} jail aktif`],
];

const SEV_TEKS = { critical: "text-red-600", high: "text-orange-600", medium: "text-amber-600", low: "text-slate-500" };

/* ───────────── Fungsi murni (bisa diuji tanpa browser) ───────────── */

const indeksFase = (d) => (d >= DURASI ? -1 : FASE.findIndex((f) => d >= f.mulai && d < f.akhir));

const lajuPada = (d) => {
	const i = indeksFase(d);
	if (i < 0) return 0;
	const f = FASE[i];
	return f.turun ? f.laju * (1 - (d - f.mulai) / (f.akhir - f.mulai)) : f.laju;
};

// Skala meter 0..1 (dikali Gbps/paket maksimum): naik cepat saat DDoS, lalu surut.
const meterPada = (d, acak = Math.random) => {
	if (d < 20) return 0.002;
	if (d < 38) return Math.min(1, (1 - Math.exp(-(d - 20) / 2.5)) * (1 + (acak() * 2 - 1) * 0.08));
	if (d < 50) return 0.15;
	return Math.max(0, 0.15 * (1 - (d - 50) / 10));
};

const pilihBobot = (daftar, acak = Math.random) => {
	let r = acak() * daftar.reduce((t, [, w]) => t + w, 0);
	for (const [v, w] of daftar) if ((r -= w) < 0) return v;
	return daftar[0][0];
};

const ipAcak = () => {
	let a;
	do a = 1 + Math.floor(Math.random() * 223);
	while ([10, 127, 172, 192, 100].includes(a));
	return `${a}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${1 + Math.floor(Math.random() * 254)}`;
};

const jitter = (v, maks) => Math.max(-maks, Math.min(maks, v + (Math.random() * 4 - 2)));

const jam = () => new Date().toTimeString().slice(0, 8);

const baru = () => ({
	detik: 0, faseIdx: -1, acc: 0, logTok: 0, sndTok: 0, alarmBerikut: 0, logMitigasi: 0, id: 0,
	total: 0, ips: new Set(), negara: new Set(), login: 0, ditolak: 0, diblokir: 0, puncak: 0, gbps: 0, pps: 0, log: [],
});

/* ───────────── Hook ───────────── */

// Hook & overlay satu berkas sesuai rancangan; fast-refresh penuh tidak diperlukan.
// eslint-disable-next-line react-refresh/only-export-components
export const useSimulasi = (globe, opsiRef) => {
	const [status, setStatus] = useState("diam"); // diam | jalan | selesai
	const [tampil, setTampil] = useState(() => ({ detik: 0, faseIdx: 0, statistik: null, log: [] }));
	const m = useRef(baru());

	const snapshot = () => {
		const s = m.current;
		return {
			detik: s.detik,
			faseIdx: s.faseIdx,
			statistik: { total: s.total, penyerang: s.ips.size, negara: s.negara.size, login: s.login, ditolak: s.ditolak, diblokir: s.diblokir, gbps: s.gbps, pps: s.pps, puncak: s.puncak },
			log: s.log.slice(-40),
		};
	};

	const mulai = useCallback(() => {
		suara.buka();
		m.current = baru();
		setTampil(snapshot());
		setStatus("jalan");
	}, []);
	const tutup = useCallback(() => setStatus("diam"), []);

	useEffect(() => {
		if (status !== "jalan") return undefined;
		const alarmOn = () => !!opsiRef.current?.alarm;
		let raf = 0;
		let lalu = performance.now();
		let render = 0;
		const tambahLog = (s, baris) => {
			s.log.push({ id: s.id++, ...baris });
			if (s.log.length > 40) s.log.shift();
		};
		const langkah = (kini) => {
			const s = m.current;
			const dt = Math.max(0, Math.min(0.1, (kini - lalu) / 1000));
			lalu = kini;
			s.detik += dt;
			const d = s.detik;
			const idx = indeksFase(d);

			if (idx !== s.faseIdx && idx >= 0) {
				s.faseIdx = idx;
				tambahLog(s, { sys: true, teks: `=== FASE ${idx + 1}/5: ${FASE[idx].nama} ===` });
				if (alarmOn()) {
					suara.peringatan();
					if (idx === 2) suara.alarm();
				}
			}
			if (alarmOn() && (idx === 2 || idx === 3) && d >= s.alarmBerikut) {
				if (s.alarmBerikut) suara.alarm();
				s.alarmBerikut = d + 4;
			}

			if (idx >= 0) {
				const f = FASE[idx];
				s.acc += lajuPada(d) * dt;
				s.logTok = Math.min(15, s.logTok + 15 * dt);
				s.sndTok = Math.min(6, s.sndTok + 6 * dt);
				const n = Math.min(20, Math.floor(s.acc));
				s.acc -= Math.floor(s.acc); // kelebihan di atas batas frame dibuang
				for (let i = 0; i < n; i++) {
					const [cc, , lat, lon] = KOTA[Math.floor(Math.random() * f.kota)];
					const sev = pilihBobot(f.sev);
					const ip = ipAcak();
					globe.current?.strike({ lat: jitter(lat, 85), lon: jitter(lon, 180), sev });
					s.total++;
					s.ips.add(ip);
					s.negara.add(cc);
					if (f.login) s.login++;
					if (f.tolak) s.ditolak++;
					if (alarmOn() && s.sndTok >= 1) {
						s.sndTok--;
						suara.serangan(sev);
					}
					if (f.jenis && s.logTok >= 1) {
						s.logTok--;
						tambahLog(s, { t: jam(), sev, ip, cc, teks: f.jenis[Math.floor(Math.random() * f.jenis.length)], tolak: !!f.tolak });
					}
				}
			}

			// Meter palsu + IP diblokir (melonjak saat mitigasi).
			const skala = meterPada(d);
			s.gbps = 48.7 * skala;
			s.pps = 3.2e6 * skala;
			s.puncak = Math.max(s.puncak, s.gbps);
			s.diblokir = d < 50 ? 0 : Math.round(s.ips.size * Math.min(1, ((d - 50) / 10) * 1.5));
			while (s.logMitigasi < LOG_MITIGASI.length && d >= LOG_MITIGASI[s.logMitigasi][0]) {
				tambahLog(s, { sys: true, teks: LOG_MITIGASI[s.logMitigasi][1](s) });
				s.logMitigasi++;
			}

			if (d >= DURASI) {
				s.diblokir = s.ips.size;
				s.gbps = 0;
				s.pps = 0;
				tambahLog(s, { sys: true, teks: "SERANGAN DIPATAHKAN · 0 data bocor · uptime 100%", baik: true });
				setTampil(snapshot());
				setStatus("selesai");
				if (alarmOn()) suara.pulih();
				return;
			}
			if (kini - render > 100) {
				render = kini;
				setTampil(snapshot());
			}
			raf = requestAnimationFrame(langkah);
		};
		raf = requestAnimationFrame(langkah);
		return () => cancelAnimationFrame(raf);
	}, [status, globe, opsiRef]);

	useEffect(() => {
		if (status === "diam") return undefined;
		const esc = (e) => e.key === "Escape" && setStatus("diam");
		window.addEventListener("keydown", esc);
		return () => window.removeEventListener("keydown", esc);
	}, [status]);

	const fase = Math.max(0, tampil.faseIdx);
	const guncang = status === "jalan" && (fase === 2 || fase === 3);
	return { aktif: status === "jalan", terlihat: status !== "diam", fase, detik: tampil.detik, statistik: tampil.statistik, log: tampil.log, guncang, mulai, hentikan: tutup, tutup };
};

/* ───────────── Overlay ───────────── */

const fmt = (n, d = 0) => n.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });

// Angka bergulir halus ke nilai target (interpolasi tiap frame).
const Angka = ({ nilai, desimal = 0 }) => {
	const [tampil, setTampil] = useState(nilai);
	const kini = useRef(nilai);
	useEffect(() => {
		let raf = 0;
		const langkah = () => {
			kini.current += (nilai - kini.current) * 0.25;
			if (Math.abs(nilai - kini.current) < Math.max(0.05, Math.abs(nilai) * 0.001)) kini.current = nilai;
			setTampil(kini.current);
			if (kini.current !== nilai) raf = requestAnimationFrame(langkah);
		};
		raf = requestAnimationFrame(langkah);
		return () => cancelAnimationFrame(raf);
	}, [nilai]);
	return <>{fmt(tampil, desimal)}</>;
};

export const OverlaySimulasi = ({ sim }) => {
	const st = sim.statistik || { total: 0, penyerang: 0, negara: 0, login: 0, ditolak: 0, diblokir: 0, gbps: 0, pps: 0, puncak: 0 };
	const selesai = !sim.aktif;
	const ddos = sim.aktif && sim.fase === 2;
	// [label, nilai, desimal, satuan, utama (tetap tampil di HP), merah]
	const baris = [
		["Lalu lintas", st.gbps, 1, "Gbps", true, ddos],
		["Paket", st.pps, 0, "/dtk", false, ddos],
		["Penyerang", st.penyerang, 0, "IP", true, false],
		["Negara", st.negara, 0, "", false, false],
		["Percobaan login", st.login, 0, "", false, false],
		["Eksploit ditolak", st.ditolak, 0, "", false, false],
		["IP diblokir", st.diblokir, 0, "IP", true, false],
	];
	return (
		<div className="pointer-events-none absolute inset-0 z-20">
			{sim.guncang && (
				<div className="kali-sim-strobo absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(220,38,38,.7) 100%)" }} />
			)}

			{/* Spanduk tipis di paling atas */}
			<p className="kali-sim-kedip absolute inset-x-0 top-0 px-2 py-0.5 text-center text-[10.5px] font-bold tracking-[0.12em]" style={{ background: "#b91c1c", color: "#fff" }}>
				⚠ SIMULASI SERANGAN — DATA PALSU, TIDAK ADA SERANGAN NYATA
			</p>

			{/* Nama fase + segmen + progres, tengah atas */}
			<div className="absolute inset-x-0 top-12 flex flex-col items-center px-3 sm:top-8">
				<p className="kali-hud-label">Fase {Math.min(sim.fase + 1, FASE.length)} dari {FASE.length}</p>
				<p
					aria-live="polite"
					className={`kali-display text-3xl font-black tracking-tight sm:text-[40px] sm:leading-[44px] ${selesai ? "text-emerald-400" : "text-red-500"}`}
					style={{ textShadow: selesai ? "0 0 22px rgba(16,185,129,.55)" : "0 0 22px rgba(239,68,68,.75), 0 0 48px rgba(239,68,68,.4)" }}
				>
					{selesai ? "SELESAI" : FASE[sim.fase].nama}
				</p>
				<div className="pointer-events-auto mt-2 w-full max-w-lg">
					<div className="kali-segmen !grid-cols-5 !gap-1 !h-1.5" aria-hidden="true">
						{FASE.map((f, i) => (
							<i key={f.nama} className={i === sim.fase && sim.aktif ? "on text-red-500 shadow-[0_0_8px_#ef4444]" : i < sim.fase || selesai ? "on text-slate-400" : ""} />
						))}
					</div>
					<div className="mt-1 grid grid-cols-5 gap-1 text-center text-[9px] uppercase tracking-wider text-slate-400">
						{FASE.map((f, i) => (
							<span key={f.nama} className={`truncate ${i === sim.fase && sim.aktif ? "font-bold text-red-400" : ""}`}>{f.nama}</span>
						))}
					</div>
					<div className="mt-1.5 flex items-center gap-2 text-[10.5px] text-slate-500">
						<div className="h-0.5 flex-1 bg-slate-200">
							<div className="h-full bg-red-500" style={{ width: `${Math.min(100, (sim.detik / DURASI) * 100)}%` }} />
						</div>
						<span className="tabular-nums">{Math.min(DURASI, Math.floor(sim.detik))}/{DURASI} dtk</span>
						<button onClick={sim.hentikan} className="border border-red-500/60 px-1.5 py-px text-red-400 hover:bg-red-500/10">
							✕ hentikan
						</button>
					</div>
				</div>
			</div>

			{/* Pita statistik: kanan di desktop, bawah di HP (3 angka utama) */}
			<div className="kali-hud absolute inset-x-3 bottom-3 flex px-1 py-1.5 sm:inset-x-auto sm:right-3 sm:top-8 sm:bottom-auto sm:block sm:w-[210px] sm:px-3 sm:py-2.5">
				<p className="kali-hud-label mb-1 hidden sm:block">Statistik simulasi</p>
				{baris.map(([k, v, d, u, utama, merah]) => (
					<p key={k} className={`${utama ? "flex" : "hidden sm:flex"} flex-1 flex-col items-center sm:flex-row sm:items-baseline sm:justify-between`}>
						<span className="text-[10px] text-slate-500 sm:text-[11px]">{k}</span>
						<span className={`kali-display text-base font-bold tabular-nums sm:text-sm ${merah ? "text-red-500" : "text-slate-900"}`}>
							<Angka nilai={v} desimal={d} />
							{u && <small className="ml-0.5 text-[9px] font-normal text-slate-400">{u}</small>}
						</span>
					</p>
				))}
			</div>

			{/* Terminal log kiri bawah (disembunyikan di HP) */}
			<div className="absolute bottom-3 left-3 hidden w-[min(560px,calc(100%-260px))] bg-black/70 p-2 font-mono text-[11px] leading-snug sm:block">
				{sim.log.slice(-14).map((b) =>
					b.sys ? (
						<p key={b.id} className={`kali-baru truncate font-bold ${b.baik ? "text-emerald-400" : "text-amber-400"}`}>{`[SISTEM] ${b.teks}`}</p>
					) : (
						<p key={b.id} className={`kali-baru truncate ${SEV_TEKS[b.sev]}`}>
							{`[${b.t}] [${b.sev.toUpperCase()}] ${b.ip}  ${b.cc}  ${b.teks}`}
							{b.tolak ? "  → WAF DITOLAK" : ""}
						</p>
					),
				)}
			</div>

			{selesai && (
				<div className="absolute inset-0 flex items-center justify-center p-3">
					<div className="kali-hud kali-baru pointer-events-auto w-full max-w-sm !border-emerald-500/50 !bg-black/85 px-5 py-4 text-center shadow-[0_0_40px_rgba(16,185,129,.25)]">
						<FiShield className="mx-auto h-9 w-9 text-emerald-400" />
						<p className="kali-display mt-1 text-2xl font-black text-emerald-400">SERANGAN DIPATAHKAN</p>
						<p className="mt-1 text-[11px] text-slate-500">0 data bocor · uptime 100% · durasi {DURASI} detik</p>
						<div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-left text-[11.5px] text-slate-500">
							{[
								["Total serangan", fmt(st.total)],
								["IP penyerang", fmt(st.penyerang)],
								["Negara asal", fmt(st.negara)],
								["Percobaan login", fmt(st.login)],
								["Eksploit ditolak", fmt(st.ditolak)],
								["IP diblokir", fmt(st.diblokir)],
								["Puncak", `${fmt(st.puncak, 1)} Gbps`],
							].map(([k, v]) => (
								<React.Fragment key={k}>
									<span>{k}</span>
									<b className="text-right tabular-nums text-slate-900">{v}</b>
								</React.Fragment>
							))}
						</div>
						<div className="mt-4 flex justify-center gap-2 text-[11.5px]">
							<button onClick={sim.tutup} className="border border-slate-500 px-3 py-1 text-slate-800 hover:border-slate-800">tutup</button>
							<button onClick={sim.mulai} className="bg-red-600 px-3 py-1 font-bold text-white ring-1 ring-red-500">↺ ulangi</button>
						</div>
						<p className="mt-2 text-[9.5px] uppercase tracking-wider text-slate-400">simulasi · data palsu</p>
					</div>
				</div>
			)}
		</div>
	);
};
