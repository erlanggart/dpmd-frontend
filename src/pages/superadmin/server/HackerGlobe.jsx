// src/pages/superadmin/server/HackerGlobe.jsx
//
// Globe ancaman: bola dunia berputar (canvas 2D, proyeksi ortografis) berisi
// titik daratan, IP penyerang beserta busur serangan menuju server, dan IP
// pengunjung. Bisa diseret untuk memutar, titik bisa diarahkan (tooltip) dan
// diklik (onSelect). Saat sebuah IP dipilih, globe berputar menghadapnya.
//
// Tanpa library 3D: ±5.000 titik daratan + busur diproyeksikan ulang tiap
// frame, cukup ringan untuk 60 fps. Animasi berhenti saat tab peramban
// tersembunyi atau globe keluar layar, dan putar otomatis dimatikan bila
// pengguna memilih "kurangi gerakan".

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { titikDaratan } from "./landMask";

const RAD = Math.PI / 180;

const WARNA = {
	critical: [255, 59, 78],
	high: [255, 140, 51],
	medium: [255, 191, 31],
	blocked: [120, 140, 128],
	visitor: [0, 255, 102],
	server: [34, 211, 238],
};

const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

/** Lintang/bujur (derajat) → vektor satuan bumi-tetap. */
const keVektor = (lat, lon) => {
	const p = lat * RAD;
	const l = lon * RAD;
	return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
};

/** Titik-titik busur lingkaran besar A → B, terangkat di tengah. */
const buatBusur = (a, b, n = 40) => {
	const va = keVektor(a.lat, a.lon);
	const vb = keVektor(b.lat, b.lon);
	const dot = Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
	const sudut = Math.acos(dot);
	// Busur rendah: serangan dari jauh tetap menempel di bola, tidak melingkar
	// keluar layar.
	const tinggi = Math.min(0.2, 0.04 + sudut * 0.075);
	const titik = [];
	for (let i = 0; i <= n; i += 1) {
		const t = i / n;
		let v;
		if (sudut < 1e-4) v = va;
		else {
			const s = Math.sin(sudut);
			const k1 = Math.sin((1 - t) * sudut) / s;
			const k2 = Math.sin(t * sudut) / s;
			v = [va[0] * k1 + vb[0] * k2, va[1] * k1 + vb[1] * k2, va[2] * k1 + vb[2] * k2];
		}
		const lat = Math.asin(Math.max(-1, Math.min(1, v[2])));
		const lon = Math.atan2(v[1], v[0]);
		titik.push([lat, lon, 1 + tinggi * Math.sin(Math.PI * t)]);
	}
	return titik;
};

const kurangiGerak = () =>
	typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const DURASI_TEMBAK = 1.5; // detik busur berjalan dari asal ke server
const DURASI_DAMPAK = 0.9;

const HackerGlobe = forwardRef(function HackerGlobe(
	{
		attackers = [],
		visitors = [],
		server,
		selectedIp,
		onSelect,
		height = 520,
		showArcs = true,
		showVisitors = true,
		showStatic = true,
		autoRotate = true,
		skala = 0.4, // radius bola terhadap sisi terpendek kanvas
		overlay = null,
	},
	ref,
) {
	const wadah = useRef(null);
	const kanvas = useRef(null);
	const keadaan = useRef({
		lonC: server ? server.lon - 25 : 100,
		latC: 12,
		vLon: 0,
		vLat: 0,
		zoom: 1,
		seret: null,
		hover: null,
		target: null,
		terlihat: true,
		tanda: [],
		tembakan: [], // serangan langsung/replay: { busur, warna, lat, lon, mulai }
		dampak: 0, // waktu dampak terakhir di server (untuk kilatan merah)
	});

	// strike({ lat, lon, sev }) — tembakkan satu serangan ke server. Dipakai
	// umpan langsung dan replay; tidak memicu render React.
	useImperativeHandle(ref, () => ({
		strike: ({ lat, lon, sev }) => {
			if (lat === null || lat === undefined || lon === null || lon === undefined) return;
			const k = keadaan.current;
			const sv = lapisanRef.current.sv;
			k.tembakan.push({
				busur: buatBusur({ lat, lon }, sv, 36),
				warna: WARNA[sev] || (sev === "low" ? [0, 255, 102] : WARNA.medium),
				lat,
				lon,
				mulai: performance.now(),
			});
			if (k.tembakan.length > 90) k.tembakan.splice(0, k.tembakan.length - 90);
		},
		focus: (lat, lon) => {
			keadaan.current.target = { lon, lat: Math.max(-60, Math.min(60, lat)) };
		},
	}));
	const [tip, setTip] = useState(null);
	const [zoom, setZoom] = useState(1);

	const daratan = useMemo(() => {
		const t = titikDaratan(1.5);
		const n = t.length / 2;
		const sinLat = new Float32Array(n);
		const cosLat = new Float32Array(n);
		const lon = new Float32Array(n);
		for (let i = 0; i < n; i += 1) {
			sinLat[i] = Math.sin(t[i * 2]);
			cosLat[i] = Math.cos(t[i * 2]);
			lon[i] = t[i * 2 + 1];
		}
		return { n, sinLat, cosLat, lon };
	}, []);

	// Data yang digambar: penyerang ber-lokasi + busur ke server.
	const lapisan = useMemo(() => {
		const sv = server || { lat: -6.48, lon: 106.85 };
		const serang = attackers
			.filter((a) => a.geo && a.geo.lat !== null && a.geo.lon !== null)
			.map((a, i) => ({
				...a,
				lat: a.geo.lat,
				lon: a.geo.lon,
				ukuran: 2.5 + Math.min(6, Math.log10(1 + a.n) * 2.6),
				warna: a.blocked ? WARNA.blocked : WARNA[a.severity] || WARNA.medium,
				fase: (i * 0.137) % 1,
				laju: 0.18 + ((i * 7) % 10) / 60,
			}));
		// Busur hanya untuk 70 IP teratas yang belum diblokir supaya tidak riuh.
		const berbusur = serang.filter((a) => !a.blocked).slice(0, 70);
		for (const a of berbusur) a.busur = buatBusur(a, sv);
		const tamu = visitors
			.filter((v) => v.geo && v.geo.lat !== null)
			.map((v) => ({ ...v, lat: v.geo.lat, lon: v.geo.lon }));
		return { serang, tamu, sv };
	}, [attackers, visitors, server]);

	const lapisanRef = useRef(lapisan);
	lapisanRef.current = lapisan;
	const opsiRef = useRef({ showArcs, showVisitors, autoRotate, selectedIp });
	opsiRef.current = { showArcs, showVisitors, showStatic, autoRotate, selectedIp, skala };
	const onSelectRef = useRef(onSelect);
	onSelectRef.current = onSelect;

	// Putar menghadap IP yang dipilih.
	useEffect(() => {
		if (!selectedIp) return;
		const a = lapisan.serang.find((x) => x.ip === selectedIp) || lapisan.tamu.find((x) => x.ip === selectedIp);
		if (a) keadaan.current.target = { lon: a.lon, lat: Math.max(-60, Math.min(60, a.lat)) };
	}, [selectedIp, lapisan]);

	useEffect(() => {
		keadaan.current.zoom = zoom;
	}, [zoom]);

	useEffect(() => {
		const cv = kanvas.current;
		const box = wadah.current;
		if (!cv || !box) return undefined;
		const ctx = cv.getContext("2d");
		const k = keadaan.current;
		const gerakMin = kurangiGerak();
		let lebar = 0;
		let tinggi = 0;
		let dpr = 1;
		let raf = 0;
		let bintang = [];
		let lalu = performance.now();

		const ukur = () => {
			dpr = Math.min(2, window.devicePixelRatio || 1);
			lebar = box.clientWidth;
			tinggi = box.clientHeight;
			cv.width = Math.round(lebar * dpr);
			cv.height = Math.round(tinggi * dpr);
			cv.style.width = `${lebar}px`;
			cv.style.height = `${tinggi}px`;
			// Bintang latar: posisi tetap per ukuran, berkelip pelan.
			bintang = Array.from({ length: Math.round((lebar * tinggi) / 2600) }, () => [Math.random() * lebar * dpr, Math.random() * tinggi * dpr, Math.random() * 1.3 + 0.3, Math.random() * 6]);
		};
		ukur();
		const ro = new ResizeObserver(ukur);
		ro.observe(box);
		const io = new IntersectionObserver(([e]) => {
			k.terlihat = e.isIntersecting;
		});
		io.observe(box);

		const gambar = (kini) => {
			raf = requestAnimationFrame(gambar);
			if (!k.terlihat || document.visibilityState !== "visible") return;
			const dt = Math.min(0.05, (kini - lalu) / 1000);
			lalu = kini;
			const opsi = opsiRef.current;
			const L = lapisanRef.current;

			// Rotasi: tuju target → inersia seret → putar otomatis.
			if (k.target) {
				let dl = ((k.target.lon - k.lonC + 540) % 360) - 180;
				const dp = k.target.lat - k.latC;
				k.lonC += dl * Math.min(1, dt * 3.2);
				k.latC += dp * Math.min(1, dt * 3.2);
				if (Math.abs(dl) < 0.2 && Math.abs(dp) < 0.2) k.target = null;
			} else if (!k.seret) {
				k.lonC += k.vLon * dt;
				k.latC += k.vLat * dt;
				k.vLon *= 0.94;
				k.vLat *= 0.9;
				if (opsi.autoRotate && !gerakMin && !k.hover && Math.abs(k.vLon) < 2) k.lonC += 6 * dt;
			}
			k.latC = Math.max(-75, Math.min(75, k.latC));

			const W = lebar * dpr;
			const H = tinggi * dpr;
			const cx = W / 2;
			const cy = H / 2;
			const R = Math.min(W, H) * opsi.skala * k.zoom;
			const lc = k.lonC * RAD;
			const sinC = Math.sin(k.latC * RAD);
			const cosC = Math.cos(k.latC * RAD);

			// Proyeksi (radian, radius r) → [x, y, z, terlihat]
			const proyeksi = (lat, lon, r = 1) => {
				const cl = Math.cos(lat);
				const sl = Math.sin(lat);
				const d = lon - lc;
				const cd = Math.cos(d);
				const x = cl * Math.sin(d);
				const y = cosC * sl - sinC * cl * cd;
				const z = sinC * sl + cosC * cl * cd;
				const tampak = z > 0 || x * x * r * r + y * y * r * r > 1;
				return [cx + R * r * x, cy - R * r * y, z, tampak];
			};

			ctx.clearRect(0, 0, W, H);

			// Bintang latar
			for (const [bx, by, br, bf] of bintang) {
				ctx.fillStyle = `rgba(180,255,200,${0.25 + 0.35 * Math.abs(Math.sin(kini / 1400 + bf))})`;
				ctx.fillRect(bx, by, br * dpr, br * dpr);
			}

			// Cincin HUD: skala derajat berputar pelan + dua busur sorot
			{
				const rc = R * 1.1;
				const putar = (kini / 1000) * 0.08;
				ctx.strokeStyle = "rgba(0,255,65,0.16)";
				ctx.lineWidth = 1 * dpr;
				ctx.beginPath();
				ctx.arc(cx, cy, rc, 0, Math.PI * 2);
				ctx.stroke();
				for (let d = 0; d < 360; d += 5) {
					const a = d * RAD + putar;
					const panjang = d % 30 === 0 ? 9 : 4;
					ctx.strokeStyle = d % 30 === 0 ? "rgba(0,255,65,0.55)" : "rgba(0,255,65,0.22)";
					ctx.beginPath();
					ctx.moveTo(cx + Math.cos(a) * rc, cy + Math.sin(a) * rc);
					ctx.lineTo(cx + Math.cos(a) * (rc + panjang * dpr), cy + Math.sin(a) * (rc + panjang * dpr));
					ctx.stroke();
				}
				ctx.font = `${8.5 * dpr}px "JetBrains Mono", monospace`;
				ctx.fillStyle = "rgba(0,255,65,0.45)";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				for (let d = 0; d < 360; d += 30) {
					const a = d * RAD + putar;
					ctx.fillText(String(d).padStart(3, "0"), cx + Math.cos(a) * (rc + 20 * dpr), cy + Math.sin(a) * (rc + 20 * dpr));
				}
				ctx.textAlign = "start";
				ctx.lineWidth = 2.5 * dpr;
				ctx.strokeStyle = "rgba(0,255,65,0.6)";
				ctx.beginPath();
				ctx.arc(cx, cy, rc + 3 * dpr, -putar * 3, -putar * 3 + 0.6);
				ctx.stroke();
				ctx.strokeStyle = "rgba(34,211,238,0.55)";
				ctx.beginPath();
				ctx.arc(cx, cy, rc + 3 * dpr, Math.PI - putar * 3, Math.PI - putar * 3 + 0.35);
				ctx.stroke();
			}

			// Atmosfer & bola
			const atm = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.28);
			atm.addColorStop(0, "rgba(0,255,65,0.20)");
			atm.addColorStop(0.35, "rgba(0,255,65,0.07)");
			atm.addColorStop(1, "rgba(0,255,65,0)");
			ctx.fillStyle = atm;
			ctx.beginPath();
			ctx.arc(cx, cy, R * 1.28, 0, Math.PI * 2);
			ctx.fill();
			const bola = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
			bola.addColorStop(0, "#0b2716");
			bola.addColorStop(1, "#020a05");
			ctx.fillStyle = bola;
			ctx.beginPath();
			ctx.arc(cx, cy, R, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = "rgba(0,255,65,0.45)";
			ctx.lineWidth = 1 * dpr;
			ctx.stroke();

			// Graticule tiap 30°
			ctx.strokeStyle = "rgba(0,255,65,0.09)";
			ctx.lineWidth = 0.8 * dpr;
			for (let lon = -180; lon < 180; lon += 30) {
				ctx.beginPath();
				let mulai = true;
				for (let lat = -90; lat <= 90; lat += 4) {
					const [x, y, z] = proyeksi(lat * RAD, lon * RAD);
					if (z < 0) { mulai = true; continue; }
					if (mulai) ctx.moveTo(x, y); else ctx.lineTo(x, y);
					mulai = false;
				}
				ctx.stroke();
			}
			for (let lat = -60; lat <= 60; lat += 30) {
				ctx.beginPath();
				let mulai = true;
				for (let lon = -180; lon <= 180; lon += 4) {
					const [x, y, z] = proyeksi(lat * RAD, lon * RAD);
					if (z < 0) { mulai = true; continue; }
					if (mulai) ctx.moveTo(x, y); else ctx.lineTo(x, y);
					mulai = false;
				}
				ctx.stroke();
			}

			// Titik daratan — kecerahan mengikuti kedalaman supaya terasa 3D.
			const s = Math.max(1, 1.5 * dpr * Math.sqrt(k.zoom));
			const { n, sinLat, cosLat, lon } = daratan;
			for (let i = 0; i < n; i += 1) {
				const d = lon[i] - lc;
				const cd = Math.cos(d);
				const z = sinC * sinLat[i] + cosC * cosLat[i] * cd;
				if (z <= 0.02) continue;
				const x = cosLat[i] * Math.sin(d);
				const y = cosC * sinLat[i] - sinC * cosLat[i] * cd;
				ctx.fillStyle = `rgba(0,255,65,${0.18 + z * 0.62})`;
				ctx.fillRect(cx + R * x - s / 2, cy - R * y - s / 2, s, s);
			}

			const tanda = [];
			const waktu = kini / 1000;

			// Busur serangan + komet berjalan
			if (opsi.showArcs && opsi.showStatic) {
				for (const a of L.serang) {
					if (!a.busur) continue;
					const pts = a.busur.map(([la, lo, r]) => proyeksi(la, lo, r));
					ctx.strokeStyle = rgba(a.warna, opsi.selectedIp === a.ip ? 0.75 : 0.22);
					ctx.lineWidth = (opsi.selectedIp === a.ip ? 1.8 : 1) * dpr;
					ctx.beginPath();
					let mulai = true;
					for (const p of pts) {
						if (!p[3]) { mulai = true; continue; }
						if (mulai) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
						mulai = false;
					}
					ctx.stroke();
					const t = (waktu * a.laju + a.fase) % 1;
					const ujung = Math.floor(t * (pts.length - 1));
					const ekor = Math.max(0, ujung - 7);
					for (let j = ekor; j < ujung; j += 1) {
						const p1 = pts[j];
						const p2 = pts[j + 1];
						if (!p1[3] || !p2[3]) continue;
						ctx.strokeStyle = rgba(a.warna, ((j - ekor + 1) / 8) * 0.95);
						ctx.lineWidth = 2.2 * dpr;
						ctx.beginPath();
						ctx.moveTo(p1[0], p1[1]);
						ctx.lineTo(p2[0], p2[1]);
						ctx.stroke();
					}
				}
			}

			// Pengunjung
			if (opsi.showVisitors) {
				for (const v of L.tamu) {
					const [x, y, z] = proyeksi(v.lat * RAD, v.lon * RAD);
					if (z <= 0) continue;
					ctx.fillStyle = rgba(WARNA.visitor, 0.55 + z * 0.4);
					ctx.beginPath();
					ctx.arc(x, y, 2.2 * dpr, 0, Math.PI * 2);
					ctx.fill();
					tanda.push({ x, y, r: 6 * dpr, jenis: "visitor", data: v });
				}
			}

			// Penyerang
			for (const a of opsi.showStatic ? L.serang : []) {
				const [x, y, z] = proyeksi(a.lat * RAD, a.lon * RAD);
				if (z <= 0) continue;
				const r = a.ukuran * dpr;
				const pilih = opsi.selectedIp === a.ip;
				if (a.blocked) {
					ctx.strokeStyle = rgba(a.warna, 0.9);
					ctx.lineWidth = 1.6 * dpr;
					ctx.beginPath();
					ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r);
					ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r);
					ctx.stroke();
				} else {
					const denyut = (waktu * 0.9 + a.fase) % 1;
					ctx.strokeStyle = rgba(a.warna, (1 - denyut) * 0.7);
					ctx.lineWidth = 1.2 * dpr;
					ctx.beginPath();
					ctx.arc(x, y, r + denyut * 12 * dpr, 0, Math.PI * 2);
					ctx.stroke();
					ctx.fillStyle = rgba(a.warna, 0.95);
					ctx.shadowColor = rgba(a.warna, 0.9);
					ctx.shadowBlur = 10 * dpr;
					ctx.beginPath();
					ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
					ctx.fill();
					ctx.shadowBlur = 0;
				}
				if (pilih) {
					ctx.strokeStyle = "rgba(255,255,255,0.95)";
					ctx.lineWidth = 1.4 * dpr;
					ctx.setLineDash([4 * dpr, 3 * dpr]);
					ctx.beginPath();
					ctx.arc(x, y, r + 7 * dpr, 0, Math.PI * 2);
					ctx.stroke();
					ctx.setLineDash([]);
				}
				tanda.push({ x, y, r: Math.max(8 * dpr, r + 4 * dpr), jenis: "attacker", data: a });
			}

			// Label negara untuk 6 penyerang teratas yang tampak
			ctx.font = `${10 * dpr}px ui-monospace, Consolas, monospace`;
			ctx.textBaseline = "middle";
			let label = 0;
			for (const tnd of tanda) {
				if (tnd.jenis !== "attacker" || label >= 6 || tnd.data.blocked) continue;
				const teks = `${tnd.data.geo?.cc || "??"} ${tnd.data.n}`;
				ctx.fillStyle = "rgba(2,10,5,0.75)";
				const w = ctx.measureText(teks).width;
				ctx.fillRect(tnd.x + 9 * dpr, tnd.y - 7 * dpr, w + 8 * dpr, 14 * dpr);
				ctx.fillStyle = rgba(tnd.data.warna, 1);
				ctx.fillText(teks, tnd.x + 13 * dpr, tnd.y);
				label += 1;
			}

			// Server
			{
				const [x, y, z] = proyeksi(L.sv.lat * RAD, L.sv.lon * RAD);
				if (z > 0) {
					const denyut = (waktu * 0.6) % 1;
					for (let j = 0; j < 2; j += 1) {
						const d = (denyut + j * 0.5) % 1;
						ctx.strokeStyle = rgba(WARNA.server, (1 - d) * 0.8);
						ctx.lineWidth = 1.5 * dpr;
						ctx.beginPath();
						ctx.arc(x, y, 4 * dpr + d * 22 * dpr, 0, Math.PI * 2);
						ctx.stroke();
					}
					ctx.fillStyle = rgba(WARNA.server, 1);
					ctx.fillRect(x - 3.5 * dpr, y - 3.5 * dpr, 7 * dpr, 7 * dpr);
					ctx.fillStyle = rgba(WARNA.server, 0.95);
					ctx.fillText(L.sv.label || "SERVER", x + 10 * dpr, y + 12 * dpr);
					tanda.push({ x, y, r: 10 * dpr, jenis: "server", data: L.sv });
				}
			}

			// Serangan langsung / replay: busur terang dengan kepala komet, kilatan
			// di titik asal, lalu cincin dampak di server.
			if (k.tembakan.length) {
				const sisa = [];
				for (const s of k.tembakan) {
					const umur = (kini - s.mulai) / 1000;
					if (umur > DURASI_TEMBAK + DURASI_DAMPAK) continue;
					sisa.push(s);
					const pts = s.busur.map(([la, lo, r]) => proyeksi(la, lo, r));
					const maju = Math.min(1, umur / DURASI_TEMBAK);
					const ujung = Math.floor(maju * (pts.length - 1));
					const ekor = Math.max(0, ujung - 14);
					const pudar = umur > DURASI_TEMBAK ? 1 - (umur - DURASI_TEMBAK) / DURASI_DAMPAK : 1;
					ctx.shadowColor = rgba(s.warna, 0.9);
					ctx.shadowBlur = 8 * dpr;
					for (let j = ekor; j < ujung; j += 1) {
						const p1 = pts[j];
						const p2 = pts[j + 1];
						if (!p1[3] || !p2[3]) continue;
						ctx.strokeStyle = rgba(s.warna, ((j - ekor + 1) / 15) * pudar);
						ctx.lineWidth = 2.6 * dpr;
						ctx.beginPath();
						ctx.moveTo(p1[0], p1[1]);
						ctx.lineTo(p2[0], p2[1]);
						ctx.stroke();
					}
					ctx.shadowBlur = 0;
					if (umur < 0.7) {
						const [x, y, z] = proyeksi(s.lat * RAD, s.lon * RAD);
						if (z > 0) {
							ctx.strokeStyle = rgba(s.warna, 1 - umur / 0.7);
							ctx.lineWidth = 2 * dpr;
							ctx.beginPath();
							ctx.arc(x, y, (3 + umur * 26) * dpr, 0, Math.PI * 2);
							ctx.stroke();
						}
					}
					if (umur >= DURASI_TEMBAK && !s.tiba) {
						s.tiba = true;
						k.dampak = kini;
					}
				}
				k.tembakan = sisa;
			}
			if (kini - k.dampak < 700) {
				const [x, y, z] = proyeksi(L.sv.lat * RAD, L.sv.lon * RAD);
				if (z > 0) {
					const d = (kini - k.dampak) / 700;
					ctx.strokeStyle = `rgba(255,59,78,${1 - d})`;
					ctx.lineWidth = 2.5 * dpr;
					ctx.beginPath();
					ctx.arc(x, y, (6 + d * 34) * dpr, 0, Math.PI * 2);
					ctx.stroke();
				}
			}

			// Garis pindai radar
			const pindai = ((waktu * 0.25) % 1) * 2 - 1;
			const yPindai = cy + pindai * R;
			const lebarPindai = Math.sqrt(Math.max(0, R * R - (yPindai - cy) ** 2));
			ctx.strokeStyle = "rgba(0,255,65,0.16)";
			ctx.lineWidth = 1 * dpr;
			ctx.beginPath();
			ctx.moveTo(cx - lebarPindai, yPindai);
			ctx.lineTo(cx + lebarPindai, yPindai);
			ctx.stroke();

			k.tanda = tanda;
		};
		raf = requestAnimationFrame(gambar);

		const posisi = (e) => {
			const b = cv.getBoundingClientRect();
			return [(e.clientX - b.left) * dpr, (e.clientY - b.top) * dpr];
		};
		const cari = (px, py) => {
			let terbaik = null;
			let jarak = Infinity;
			for (const t of k.tanda) {
				const d = Math.hypot(t.x - px, t.y - py);
				if (d <= t.r && d < jarak) {
					terbaik = t;
					jarak = d;
				}
			}
			return terbaik;
		};

		const turun = (e) => {
			k.seret = { x: e.clientX, y: e.clientY, lon: k.lonC, lat: k.latC, t: performance.now(), pindah: 0 };
			k.target = null;
			cv.setPointerCapture?.(e.pointerId);
		};
		const gerak = (e) => {
			if (k.seret) {
				const R = Math.min(lebar, tinggi) * opsiRef.current.skala * k.zoom;
				const dx = e.clientX - k.seret.x;
				const dy = e.clientY - k.seret.y;
				k.seret.pindah = Math.max(k.seret.pindah, Math.hypot(dx, dy));
				const lonBaru = k.seret.lon - (dx / R) * 57;
				const latBaru = k.seret.lat + (dy / R) * 57;
				const kini = performance.now();
				const dtt = Math.max(1, kini - (k.seret.tAkhir || k.seret.t)) / 1000;
				k.vLon = (lonBaru - k.lonC) / dtt;
				k.vLat = (latBaru - k.latC) / dtt;
				k.seret.tAkhir = kini;
				k.lonC = lonBaru;
				k.latC = latBaru;
				return;
			}
			const [px, py] = posisi(e);
			const t = cari(px, py);
			const kunci = t ? `${t.jenis}:${t.data.ip || "srv"}` : null;
			if (kunci !== k.hover) {
				k.hover = kunci;
				setTip(t ? { jenis: t.jenis, data: t.data } : null);
			}
			if (t) {
				const b = cv.getBoundingClientRect();
				setTip((s) => (s ? { ...s, x: e.clientX - b.left, y: e.clientY - b.top } : s));
			}
			cv.style.cursor = t ? "pointer" : "grab";
		};
		const naik = (e) => {
			const s = k.seret;
			k.seret = null;
			if (s && s.pindah < 5) {
				const [px, py] = posisi(e);
				const t = cari(px, py);
				if (t && t.jenis !== "server") onSelectRef.current?.(t.data, t.jenis);
			}
			k.vLon = Math.max(-240, Math.min(240, k.vLon));
			k.vLat = Math.max(-120, Math.min(120, k.vLat));
		};
		const keluar = () => {
			k.hover = null;
			setTip(null);
		};

		cv.addEventListener("pointerdown", turun);
		cv.addEventListener("pointermove", gerak);
		cv.addEventListener("pointerup", naik);
		cv.addEventListener("pointercancel", naik);
		cv.addEventListener("pointerleave", keluar);
		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			io.disconnect();
			cv.removeEventListener("pointerdown", turun);
			cv.removeEventListener("pointermove", gerak);
			cv.removeEventListener("pointerup", naik);
			cv.removeEventListener("pointercancel", naik);
			cv.removeEventListener("pointerleave", keluar);
		};
	}, [daratan]);

	return (
		<div ref={wadah} className="relative w-full select-none" style={{ height }}>
			<canvas ref={kanvas} className="absolute inset-0 touch-none" style={{ cursor: "grab" }} />
			{overlay}

			<div className="absolute bottom-3 right-3 z-20 flex gap-1">
				<button type="button" onClick={() => setZoom((z) => Math.min(2.6, z * 1.25))} className="kali-ikon" title="Perbesar">+</button>
				<button type="button" onClick={() => setZoom((z) => Math.max(0.6, z / 1.25))} className="kali-ikon" title="Perkecil">−</button>
				<button
					type="button"
					onClick={() => {
						setZoom(1);
						keadaan.current.target = { lon: (server?.lon ?? 106.85) - 25, lat: 12 };
					}}
					className="kali-ikon"
					title="Kembali ke server"
				>
					⌂
				</button>
			</div>

			{tip && tip.x !== undefined && (
				<div
					className="pointer-events-none absolute z-10 min-w-[190px] max-w-[260px] rounded border border-[#1d4a2d] bg-[#020a05]/95 px-2.5 py-2 text-[11px] leading-relaxed text-[#b6f5c8] shadow-[0_0_18px_rgba(0,255,65,.18)]"
					style={{ left: Math.min(tip.x + 14, (wadah.current?.clientWidth || 300) - 270), top: Math.max(4, tip.y - 10) }}
				>
					{tip.jenis === "attacker" ? (
						<>
							<p className="font-bold text-[#ff6b78]">
								{tip.data.blocked ? "■ DIBLOKIR" : "▲ PENYERANG"} · {tip.data.ip}
							</p>
							<p>{[tip.data.geo?.city, tip.data.geo?.country].filter(Boolean).join(", ") || "Lokasi tidak diketahui"}</p>
							<p className="text-[#5fa577]">{tip.data.geo?.isp || "-"}</p>
							<p>
								{tip.data.n} kejadian · skor {tip.data.score}
							</p>
							<p className="text-[#5fa577]">{tip.data.types.slice(0, 3).join(", ")}</p>
							<p className="mt-1 text-[#00ff41]">klik untuk detail &amp; aksi →</p>
						</>
					) : tip.jenis === "visitor" ? (
						<>
							<p className="font-bold text-[#00ff66]">● PENGUNJUNG · {tip.data.ip}</p>
							<p>{[tip.data.geo?.city, tip.data.geo?.country].filter(Boolean).join(", ")}</p>
							<p className="text-[#5fa577]">{tip.data.geo?.isp || "-"}</p>
							<p>{tip.data.count} request · {tip.data.errors} error</p>
						</>
					) : (
						<p className="font-bold text-[#22d3ee]">◆ {tip.data.label || "Server"}</p>
					)}
				</div>
			)}
		</div>
	);
});

export default HackerGlobe;
