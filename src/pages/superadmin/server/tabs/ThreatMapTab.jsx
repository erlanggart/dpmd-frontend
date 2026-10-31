// Tab Peta Ancaman — globe berputar berisi IP penyerang (dari jejak keamanan)
// dan pengunjung (dari statistik trafik), lengkap dengan lokasinya. Klik titik
// untuk intel IP dan aksi: blokir/buka blokir, salin perintah firewall.
// Panel negara bisa memblokir semua IP satu negara sekaligus atau memasang
// blokir negara (geo-block) untuk request anonim. Di bawahnya umpan kejadian
// langsung bergaya terminal.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
	FiActivity,
	FiCopy,
	FiCrosshair,
	FiGlobe,
	FiLock,
	FiPlay,
	FiRefreshCw,
	FiSlash,
	FiTerminal,
	FiUnlock,
	FiX,
} from "react-icons/fi";
import api from "../../../../api";
import HackerGlobe from "../HackerGlobe";
import { Card, Galat, Memuat, PilihRentang, SeverityBadge, Stat, Toggle, formatAngka, pesanError, sejak, usePolling } from "../serverUi";

const RENTANG = [
	{ value: "1h", label: "1j" },
	{ value: "24h", label: "24j" },
	{ value: "7d", label: "7h" },
	{ value: "30d", label: "30h" },
];

const TINGKAT = {
	aman: { teks: "AMAN", kelas: "text-emerald-600" },
	waspada: { teks: "WASPADA", kelas: "text-amber-600" },
	tinggi: { teks: "TINGGI", kelas: "text-orange-600" },
	kritis: { teks: "KRITIS", kelas: "text-red-600 animate-pulse" },
};

const SEV_TEKS = { critical: "text-red-600", high: "text-orange-600", medium: "text-amber-600", low: "text-slate-500" };

const API = "/superadmin/server/security";

const salin = async (teks) => {
	try {
		await navigator.clipboard.writeText(teks);
		Swal.fire({ toast: true, position: "bottom-end", icon: "success", title: "Disalin", timer: 1400, showConfirmButton: false });
	} catch {
		Swal.fire({ icon: "info", title: "Salin manual", html: `<pre style="text-align:left;white-space:pre-wrap">${teks}</pre>` });
	}
};

const gagal = (e) => Swal.fire({ icon: "error", title: "Gagal", text: pesanError(e) });

/* ───────────────────────── Intel satu IP ───────────────────────── */

const IntelIp = ({ item, onClose, onChanged }) => {
	const [intel, setIntel] = useState(null);
	const [kejadian, setKejadian] = useState([]);
	const [memuat, setMemuat] = useState(true);

	const muat = useCallback(async () => {
		setMemuat(true);
		try {
			const [a, b] = await Promise.all([
				api.get(`${API}/geo/${encodeURIComponent(item.ip)}`),
				api.get(`${API}/events`, { params: { ip: item.ip, limit: 12, range: "30d" } }),
			]);
			setIntel(a.data?.data || null);
			setKejadian(b.data?.data || []);
		} catch (e) {
			setIntel({ error: pesanError(e) });
		} finally {
			setMemuat(false);
		}
	}, [item.ip]);

	useEffect(() => {
		muat();
	}, [muat]);

	const blokir = async (menit, label) => {
		const ok = await Swal.fire({
			icon: "warning",
			title: `Blokir ${item.ip}?`,
			html: item.private
				? `<p style="font-size:14px"><b style="color:#ff6b78">IP internal/proxy.</b> Memblokirnya bisa memutus akses SEMUA pengguna.</p>`
				: `<p style="font-size:14px">Request anonim dari IP ini ditolak ${label}.</p>`,
			showCancelButton: true,
			confirmButtonText: `Blokir ${label}`,
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});
		if (!ok.isConfirmed) return;
		try {
			await api.post(`${API}/blocklist`, { ip: item.ip, minutes: menit, reason: `Diblokir dari Peta Ancaman (${label})` });
			await muat();
			onChanged();
		} catch (e) {
			gagal(e);
		}
	};

	const buka = async () => {
		try {
			await api.delete(`${API}/blocklist/${encodeURIComponent(item.ip)}`);
			await muat();
			onChanged();
		} catch (e) {
			gagal(e);
		}
	};

	const g = intel?.geo || item.geo;
	const diblokir = intel ? !!intel.blocked : item.blocked;

	return (
		<Card
			title={`> intel ${item.ip}`}
			subtitle={item.jenis === "visitor" ? "Pengunjung (statistik trafik)" : "Sumber serangan"}
			icon={FiCrosshair}
			actions={
				<button onClick={onClose} className="kali-ikon" title="Tutup">
					<FiX className="h-3.5 w-3.5" />
				</button>
			}
		>
			{memuat && !intel ? (
				<Memuat teks="whois…" />
			) : intel?.error ? (
				<Galat pesan={intel.error} onRetry={muat} />
			) : (
				<div className="space-y-3 text-[12.5px]">
					<dl className="grid grid-cols-[92px_1fr] gap-x-2 gap-y-1">
						<dt className="text-slate-500">lokasi</dt>
						<dd className="text-slate-800">{[g?.city, g?.region, g?.country].filter(Boolean).join(", ") || "tidak diketahui"}</dd>
						<dt className="text-slate-500">negara</dt>
						<dd className="text-slate-800">{g?.cc || "-"}</dd>
						<dt className="text-slate-500">isp</dt>
						<dd className="break-words text-slate-800">{g?.isp || "-"}</dd>
						<dt className="text-slate-500">asn</dt>
						<dd className="break-words text-slate-800">{g?.asn || "-"}</dd>
						<dt className="text-slate-500">koordinat</dt>
						<dd className="text-slate-800">{g?.lat != null ? `${g.lat.toFixed(2)}, ${g.lon.toFixed(2)}` : "-"}</dd>
						<dt className="text-slate-500">jenis</dt>
						<dd className="flex flex-wrap gap-1">
							{g?.hosting && <span className="rounded bg-amber-100 px-1.5 text-amber-700">hosting/VPS</span>}
							{g?.proxy && <span className="rounded bg-red-100 px-1.5 text-red-700">proxy/VPN/Tor</span>}
							{intel?.private && <span className="rounded bg-blue-100 px-1.5 text-blue-700">internal</span>}
							{intel?.whitelisted && <span className="rounded bg-emerald-100 px-1.5 text-emerald-700">whitelist</span>}
							{!g?.hosting && !g?.proxy && !intel?.private && <span className="text-slate-500">residensial/umum</span>}
						</dd>
						<dt className="text-slate-500">skor</dt>
						<dd className="text-slate-800">{intel?.score ?? item.score ?? 0}</dd>
						<dt className="text-slate-500">30 hari</dt>
						<dd className="text-slate-800">
							{formatAngka(intel?.events_30d)} kejadian{intel?.last_seen ? ` · terakhir ${sejak(intel.last_seen)} lalu` : ""}
						</dd>
						<dt className="text-slate-500">status</dt>
						<dd className={diblokir ? "font-bold text-red-600" : "text-emerald-600"}>
							{diblokir ? `DIBLOKIR${intel?.blocked?.expires_at ? ` s/d ${new Date(intel.blocked.expires_at).toLocaleString("id-ID")}` : " permanen"}` : "terbuka"}
						</dd>
					</dl>
					{intel?.blocked?.reason && <p className="border-l-2 border-red-200 pl-2 text-[11.5px] text-slate-500">{intel.blocked.reason}</p>}

					<div className="flex flex-wrap gap-1.5">
						{diblokir ? (
							<button onClick={buka} className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white">
								<FiUnlock className="h-3.5 w-3.5" /> buka blokir
							</button>
						) : (
							<>
								<button onClick={() => blokir(60, "1 jam")} className="inline-flex items-center gap-1 rounded bg-red-100 px-2.5 py-1.5 text-xs font-bold text-red-700 ring-1 ring-red-200">
									<FiLock className="h-3.5 w-3.5" /> 1 jam
								</button>
								<button onClick={() => blokir(1440, "24 jam")} className="inline-flex items-center gap-1 rounded bg-red-100 px-2.5 py-1.5 text-xs font-bold text-red-700 ring-1 ring-red-200">
									<FiLock className="h-3.5 w-3.5" /> 24 jam
								</button>
								<button onClick={() => blokir(null, "permanen")} className="inline-flex items-center gap-1 rounded bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white">
									<FiSlash className="h-3.5 w-3.5" /> permanen
								</button>
							</>
						)}
					</div>

					<div className="space-y-1">
						<p className="text-[11px] uppercase tracking-wider text-slate-500">blokir di level sistem (salin ke server):</p>
						{[`ufw deny from ${item.ip}`, `deny ${item.ip};  # nginx`, `fail2ban-client set sshd banip ${item.ip}`].map((c) => (
							<button
								key={c}
								onClick={() => salin(c.replace(/\s+# nginx$/, ""))}
								className="flex w-full items-center justify-between gap-2 rounded bg-slate-950 px-2 py-1 text-left text-[11.5px] text-slate-200 hover:ring-1 hover:ring-slate-400"
							>
								<span className="truncate">$ {c}</span>
								<FiCopy className="h-3 w-3 shrink-0" />
							</button>
						))}
					</div>

					{kejadian.length > 0 && (
						<div>
							<p className="mb-1 text-[11px] uppercase tracking-wider text-slate-500">kejadian terakhir</p>
							<ul className="max-h-48 space-y-0.5 overflow-auto bg-slate-950 p-2 text-[11px]">
								{kejadian.map((e) => (
									<li key={e.id} className="truncate text-slate-200" title={`${e.path || ""} ${e.detail || ""}`}>
										<span className="text-slate-500">{new Date(e.created_at).toLocaleTimeString("id-ID")}</span>{" "}
										<span className={SEV_TEKS[e.severity]}>{e.label}</span> <span className="text-slate-400">{e.path || e.detail}</span>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}
		</Card>
	);
};

/* ───────────────────────── Panel negara ───────────────────────── */

const PanelNegara = ({ data, onChanged }) => {
	const [geoBlok, setGeoBlok] = useState(data.blocked_countries || []);
	useEffect(() => setGeoBlok(data.blocked_countries || []), [data.blocked_countries]);
	const maks = Math.max(1, ...data.countries.map((c) => c.events));

	const simpanGeo = async (daftar) => {
		try {
			await api.put("/superadmin/server/config", { security: { blocked_countries: daftar } });
			setGeoBlok(daftar);
			onChanged();
		} catch (e) {
			gagal(e);
		}
	};

	const aturGeo = async (c) => {
		const sudah = geoBlok.includes(c.cc);
		if (sudah) return simpanGeo(geoBlok.filter((x) => x !== c.cc));
		const ok = await Swal.fire({
			icon: "warning",
			title: `Geo-block ${c.country} (${c.cc})?`,
			html: `<p style="font-size:14px;text-align:left">Semua request <b>anonim</b> ke API dari ${c.country} ditolak 403. Pengguna yang sudah login tetap bisa masuk.<br><br>IP baru dikenali setelah lokasinya diketahui (beberapa detik setelah request pertama).</p>`,
			showCancelButton: true,
			confirmButtonText: "Blokir negara",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});
		if (ok.isConfirmed) simpanGeo([...geoBlok, c.cc]);
		return undefined;
	};

	const blokirSemua = async (c) => {
		const ips = data.attackers.filter((a) => (a.geo?.cc || (a.private ? "LAN" : "??")) === c.cc && !a.blocked && !a.private).map((a) => a.ip);
		if (!ips.length) return Swal.fire({ icon: "info", title: "Tidak ada IP yang bisa diblokir", text: "Semua IP dari negara ini sudah diblokir atau berupa IP internal." });
		const ok = await Swal.fire({
			icon: "warning",
			title: `Blokir ${ips.length} IP dari ${c.country}?`,
			text: "Semua IP penyerang dari negara ini diblokir 24 jam.",
			showCancelButton: true,
			confirmButtonText: `Blokir ${ips.length} IP`,
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});
		if (!ok.isConfirmed) return undefined;
		try {
			const res = await api.post(`${API}/blocklist/bulk`, { ips, minutes: 1440, reason: `Blokir massal negara ${c.cc} dari Peta Ancaman` });
			Swal.fire({ icon: "success", title: res.data?.message || "Selesai", timer: 1800, showConfirmButton: false });
			onChanged();
		} catch (e) {
			gagal(e);
		}
		return undefined;
	};

	return (
		<Card title="> negara asal" subtitle="Diurutkan menurut serangan serius" icon={FiGlobe} bodyClass="p-0">
			{geoBlok.length > 0 && (
				<div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 px-4 py-2 text-[11.5px]">
					<span className="text-slate-500">geo-block aktif:</span>
					{geoBlok.map((cc) => (
						<button key={cc} onClick={() => simpanGeo(geoBlok.filter((x) => x !== cc))} className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 font-bold text-red-700 ring-1 ring-red-200" title="Cabut geo-block">
							{cc} <FiX className="h-3 w-3" />
						</button>
					))}
				</div>
			)}
			<ul className="max-h-[420px] divide-y divide-slate-100 overflow-auto">
				{data.countries.length === 0 && <li className="px-4 py-6 text-center text-xs text-slate-500">Tidak ada kejadian pada rentang ini.</li>}
				{data.countries.map((c) => {
					const geoAktif = geoBlok.includes(c.cc);
					const bisaGeo = /^[A-Z]{2}$/.test(c.cc) && c.cc !== "ID";
					return (
						<li key={c.cc} className="group px-4 py-2">
							<div className="flex items-center justify-between gap-2 text-[12.5px]">
								<span className="min-w-0 truncate">
									<b className="text-slate-900">{c.cc}</b> <span className="text-slate-700">{c.country}</span>
								</span>
								<span className="shrink-0 text-slate-500">
									{formatAngka(c.events)} · {c.ips} IP{c.serius ? <span className="text-red-600"> · {c.serius}!</span> : null}
								</span>
							</div>
							<div className="mt-1 h-1.5 w-full bg-slate-100">
								<div className={`h-full ${c.serius ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${(c.events / maks) * 100}%` }} />
							</div>
							<div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
								<button onClick={() => blokirSemua(c)} className="rounded px-1.5 py-0.5 text-red-600 ring-1 ring-red-200 hover:bg-red-50">
									blokir {c.ips - c.blocked_ips} IP
								</button>
								{bisaGeo && (
									<button onClick={() => aturGeo(c)} className={`rounded px-1.5 py-0.5 ring-1 ${geoAktif ? "bg-red-600 text-white ring-red-600" : "text-amber-600 ring-amber-200 hover:bg-amber-50"}`}>
										{geoAktif ? "geo-block AKTIF" : "geo-block"}
									</button>
								)}
								{c.blocked_ips > 0 && <span className="py-0.5 text-slate-500">{c.blocked_ips} sudah diblokir</span>}
							</div>
						</li>
					);
				})}
			</ul>
		</Card>
	);
};

/* ───────────────────────── Umpan langsung ───────────────────────── */

const UmpanLangsung = ({ onPilihIp, onBaru }) => {
	const [baris, setBaris] = useState([]);
	const [jeda, setJeda] = useState(false);
	const idTerakhir = useRef(0);
	const barisBaru = useRef(new Set());
	const onBaruRef = useRef(onBaru);
	onBaruRef.current = onBaru;

	const muat = useCallback(async () => {
		if (jeda) return;
		try {
			const pertama = !idTerakhir.current;
			const res = await api.get(`${API}/events`, {
				params: { limit: 40, range: "24h", geo: "1", ...(pertama ? {} : { since_id: idTerakhir.current }) },
			});
			const data = res.data?.data || [];
			if (!data.length) return;
			idTerakhir.current = Math.max(idTerakhir.current, ...data.map((e) => e.id));
			barisBaru.current = new Set(data.map((e) => e.id));
			setBaris((lama) => [...data, ...lama].slice(0, 120));
			// Muatan pertama = riwayat, bukan serangan baru — tidak ditembakkan.
			if (!pertama) onBaruRef.current?.([...data].reverse());
		} catch {
			/* umpan diam saja bila gagal; header halaman sudah menandai offline */
		}
	}, [jeda]);

	usePolling(muat, 3000, [jeda]);

	return (
		<Card
			title="> tail -f /var/log/dpmd/security"
			subtitle="Kejadian keamanan masuk secara langsung (tiap 3 detik) dan ditembakkan ke globe"
			icon={FiTerminal}
			bodyClass="p-0"
			actions={
				<button onClick={() => setJeda((j) => !j)} className={`rounded px-2 py-1 text-[11px] font-bold ring-1 ${jeda ? "bg-amber-100 text-amber-700 ring-amber-200" : "text-emerald-600 ring-emerald-200"}`}>
					{jeda ? "❚❚ dijeda" : "● live"}
				</button>
			}
		>
			<div className="h-[300px] overflow-auto bg-slate-950 px-3 py-2 text-[11.5px] leading-[1.65]">
				{!baris.length && <p className="kali-kursor text-slate-500">menunggu kejadian</p>}
				{baris.map((e) => (
					<div key={e.id} className={`flex gap-2 whitespace-nowrap ${barisBaru.current.has(e.id) ? "kali-baru" : ""}`}>
						<span className="text-slate-500">{new Date(e.created_at).toLocaleTimeString("id-ID")}</span>
						<span className={`w-[70px] shrink-0 font-bold uppercase ${SEV_TEKS[e.severity]}`}>[{e.severity}]</span>
						<button onClick={() => onPilihIp(e.ip_address)} className="w-[128px] shrink-0 text-left text-blue-600 hover:underline">
							{e.ip_address}
						</button>
						<span className="w-[28px] shrink-0 text-slate-400">{e.geo?.cc || "··"}</span>
						<span className="text-slate-200">{e.label}</span>
						<span className="truncate text-slate-500">
							{e.method ? `${e.method} ` : ""}
							{e.path || e.detail}
						</span>
						{e.blocked && <span className="shrink-0 text-red-600">DITOLAK</span>}
					</div>
				))}
			</div>
		</Card>
	);
};

/* ───────────────────────── Alarm & replay ───────────────────────── */

/** Bunyi "bip" pendek lewat WebAudio — tanpa berkas suara. */
const buatAlarm = () => {
	let ctx = null;
	let terakhir = 0;
	return {
		siapkan: () => {
			try {
				ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
				if (ctx.state === "suspended") ctx.resume();
			} catch {
				ctx = null;
			}
		},
		bunyi: (sev) => {
			if (!ctx || Date.now() - terakhir < 350) return;
			terakhir = Date.now();
			const o = ctx.createOscillator();
			const g = ctx.createGain();
			o.type = "square";
			o.frequency.value = sev === "critical" ? 880 : 620;
			g.gain.setValueAtTime(0.0001, ctx.currentTime);
			g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.01);
			g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
			o.connect(g).connect(ctx.destination);
			o.start();
			o.stop(ctx.currentTime + 0.2);
		},
	};
};

const LAJU = [
	{ v: 30, l: "30 dtk" },
	{ v: 60, l: "1 mnt" },
	{ v: 180, l: "3 mnt" },
];

/**
 * Replay: memutar ulang kejadian ber-lokasi dalam rentang waktu sebagai
 * time-lapse. Seluruh rentang dimampatkan menjadi `durasi` detik; setiap
 * kejadian ditembakkan ke globe saat kursor waktu melewatinya.
 */
const useReplay = (globe, onTembak) => {
	const [data, setData] = useState(null);
	const [pos, setPos] = useState(0);
	const [main, setMain] = useState(false);
	const [durasi, setDurasi] = useState(60);
	const [memuat, setMemuat] = useState(false);
	const posRef = useRef(0);
	const idxRef = useRef(0);
	const onTembakRef = useRef(onTembak);
	onTembakRef.current = onTembak;

	const mulai = async (range) => {
		setMemuat(true);
		try {
			const res = await api.get(`${API}/timeline`, { params: { range } });
			const d = res.data?.data;
			const awal = d.events.length ? d.events[0].t : Date.now() - 3600000;
			const akhir = d.events.length ? d.events[d.events.length - 1].t : Date.now();
			const isi = { ...d, awal, akhir: Math.max(akhir, awal + 60000) };
			setData(isi);
			posRef.current = awal;
			idxRef.current = 0;
			setPos(awal);
			setMain(d.events.length > 0);
			if (!d.events.length) Swal.fire({ icon: "info", title: "Belum ada data replay", text: "Belum ada kejadian ber-lokasi pada rentang ini." });
		} catch (e) {
			gagal(e);
		} finally {
			setMemuat(false);
		}
	};

	const geser = (t) => {
		if (!data) return;
		posRef.current = t;
		// Lompat tanpa menembakkan kejadian yang dilewati.
		idxRef.current = data.events.findIndex((e) => e.t > t);
		if (idxRef.current < 0) idxRef.current = data.events.length;
		setPos(t);
	};

	const keluar = () => {
		setMain(false);
		setData(null);
	};

	useEffect(() => {
		if (!main || !data) return undefined;
		let raf = 0;
		let lalu = performance.now();
		let render = 0;
		const laju = (data.akhir - data.awal) / durasi; // ms data per detik nyata
		const langkah = (kini) => {
			const dt = Math.min(0.1, (kini - lalu) / 1000);
			lalu = kini;
			posRef.current += dt * laju;
			let tembak = 0;
			while (idxRef.current < data.events.length && data.events[idxRef.current].t <= posRef.current) {
				const e = data.events[idxRef.current];
				// Maks 20 tembakan per frame supaya lonjakan serangan tetap terbaca.
				if (tembak < 20) {
					globe.current?.strike({ lat: e.lat, lon: e.lon, sev: e.sev });
					onTembakRef.current?.(e);
				}
				tembak += 1;
				idxRef.current += 1;
			}
			if (posRef.current >= data.akhir) {
				posRef.current = data.akhir;
				setPos(data.akhir);
				setMain(false);
				return;
			}
			if (kini - render > 100) {
				render = kini;
				setPos(posRef.current);
			}
			raf = requestAnimationFrame(langkah);
		};
		raf = requestAnimationFrame(langkah);
		return () => cancelAnimationFrame(raf);
	}, [main, data, durasi, globe]);

	const terjadi = data ? data.events.filter((e) => e.t <= pos).length : 0;
	return { data, pos, main, setMain, durasi, setDurasi, memuat, mulai, geser, keluar, terjadi, ulang: () => geser(data?.awal || 0) };
};

const OverlayReplay = ({ r }) => {
	const d = r.data;
	const persen = ((r.pos - d.awal) / (d.akhir - d.awal)) * 100;
	const tanggal = new Date(r.pos);
	return (
		<div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-3">
			<div className="pointer-events-auto w-full max-w-xl border border-red-200 bg-black/85 px-3 py-2 shadow-[0_0_24px_rgba(255,59,78,.25)]">
				<div className="flex items-center justify-between gap-3 text-[11.5px]">
					<span className="font-bold tracking-widest text-red-600">● REPLAY {d.range}</span>
					<span className="kali-glow text-base font-bold tabular-nums text-slate-900">
						{tanggal.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} {tanggal.toLocaleTimeString("id-ID")}
					</span>
					<span className="text-slate-500">
						{formatAngka(r.terjadi)}/{formatAngka(d.events.length)}
					</span>
				</div>
				<input
					type="range"
					min={d.awal}
					max={d.akhir}
					value={r.pos}
					onChange={(e) => r.geser(Number(e.target.value))}
					className="mt-1.5 w-full accent-[#ff3b4e]"
					aria-label="Posisi waktu replay"
				/>
				<div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
					<button onClick={() => (r.pos >= d.akhir ? (r.ulang(), r.setMain(true)) : r.setMain(!r.main))} className="border border-slate-300 px-2 py-0.5 text-slate-800 hover:border-slate-900">
						{r.main ? "❚❚ jeda" : r.pos >= d.akhir ? "↺ ulang" : "▶ putar"}
					</button>
					<span className="ml-1 text-slate-500">durasi:</span>
					{LAJU.map((l) => (
						<button key={l.v} onClick={() => r.setDurasi(l.v)} className={`px-1.5 py-0.5 ${r.durasi === l.v ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"}`}>
							{l.l}
						</button>
					))}
					<span className="ml-auto text-slate-500">{Math.round(persen)}%</span>
					<button onClick={r.keluar} className="border border-red-200 px-2 py-0.5 text-red-600 hover:bg-red-50">
						✕ keluar
					</button>
				</div>
			</div>
		</div>
	);
};

/* ───────────────────────── Tab ───────────────────────── */

const ThreatMapTab = () => {
	const [rentang, setRentang] = useState("24h");
	const [data, setData] = useState(null);
	const [ringkas, setRingkas] = useState(null);
	const [galat, setGalat] = useState(null);
	const [pilih, setPilih] = useState(null);
	const [opsi, setOpsi] = useState({ arcs: true, visitors: true, rotate: true, alarm: false });
	const [live, setLive] = useState([]); // waktu tiba kejadian langsung (5 menit terakhir)
	const globe = useRef(null);
	const alarm = useRef(null);
	if (!alarm.current) alarm.current = buatAlarm();
	const opsiRef = useRef(opsi);
	opsiRef.current = opsi;

	const replay = useReplay(globe, (e) => {
		if (opsiRef.current.alarm && (e.sev === "critical" || e.sev === "high")) alarm.current.bunyi(e.sev);
	});
	const replayAktif = !!replay.data;
	// Globe menyesuaikan layar: penuh di desktop, tetap muat satu layar di HP.
	const [tinggiGlobe, setTinggiGlobe] = useState(() => (typeof window !== "undefined" && window.innerWidth < 640 ? 360 : 560));
	useEffect(() => {
		const ukur = () => setTinggiGlobe(window.innerWidth < 640 ? 360 : window.innerWidth < 1280 ? 480 : 560);
		window.addEventListener("resize", ukur);
		return () => window.removeEventListener("resize", ukur);
	}, []);

	// Kejadian baru dari umpan → tembakkan ke globe (berjeda supaya terbaca).
	const tembakLangsung = useCallback(
		(daftar) => {
			const kini = Date.now();
			setLive((l) => [...l.filter((t) => kini - t < 300000), ...daftar.map(() => kini)]);
			if (replayAktif) return;
			daftar.slice(-25).forEach((e, i) => {
				setTimeout(() => {
					globe.current?.strike({ lat: e.geo?.lat, lon: e.geo?.lon, sev: e.severity });
					if (opsiRef.current.alarm && (e.severity === "critical" || e.severity === "high")) alarm.current.bunyi(e.severity);
				}, i * 220);
			});
		},
		[replayAktif],
	);

	useEffect(() => {
		const id = setInterval(() => setLive((l) => l.filter((t) => Date.now() - t < 300000)), 15000);
		return () => clearInterval(id);
	}, []);

	const muat = useCallback(async () => {
		try {
			const [a, b] = await Promise.all([api.get(`${API}/geo`, { params: { range: rentang } }), api.get(`${API}/summary`, { params: { range: "1h" } })]);
			setData(a.data?.data || null);
			setRingkas(b.data?.data || null);
			setGalat(null);
		} catch (e) {
			setGalat(pesanError(e));
		}
	}, [rentang]);

	// Lokasi IP baru diketahui beberapa detik setelah antre — muat ulang cepat
	// selama masih ada IP tanpa lokasi.
	usePolling(muat, data?.unresolved || data?.geo?.queued ? 8000 : 20000, [rentang, data?.unresolved ? 1 : 0]);

	const pilihIp = useCallback(
		(ip) => {
			const a = data?.attackers.find((x) => x.ip === ip);
			const v = data?.visitors.find((x) => x.ip === ip);
			setPilih(a ? { ...a, jenis: "attacker" } : v ? { ...v, jenis: "visitor" } : { ip, jenis: "attacker", types: [], n: 0 });
		},
		[data],
	);

	const statistik = useMemo(() => {
		if (!data) return null;
		return {
			penyerang: data.attackers.length,
			terlokasi: data.attackers.filter((a) => a.geo).length,
			negara: data.countries.filter((c) => /^[A-Z]{2}$/.test(c.cc)).length,
			diblokir: data.attackers.filter((a) => a.blocked).length,
			kejadian: data.attackers.reduce((t, a) => t + a.n, 0),
			serius: data.attackers.reduce((t, a) => t + a.critical + a.high, 0),
		};
	}, [data]);

	if (galat && !data) return <Galat pesan={galat} onRetry={muat} />;
	if (!data) return <Memuat teks="Memetakan sumber serangan…" />;

	const t = TINGKAT[ringkas?.threat_level] || TINGKAT.aman;

	return (
		<div className="space-y-4">
			{/* Strip status */}
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
				{[
					{ k: "THREAT LEVEL", v: <span className={t.kelas}>{t.teks}</span>, h: `${ringkas?.last_hour ?? 0} kejadian/jam` },
					{ k: "LIVE · 5 MNT", v: <span className={live.length ? "text-red-600" : ""}>{formatAngka(live.length)}</span>, h: "kejadian baru masuk" },
					{ k: "PENYERANG", v: formatAngka(statistik.penyerang), h: `${statistik.terlokasi} terlokasi` },
					{ k: "NEGARA", v: formatAngka(statistik.negara), h: "asal serangan" },
					{ k: "KEJADIAN", v: formatAngka(statistik.kejadian), h: `${formatAngka(statistik.serius)} serius` },
					{ k: "DIBLOKIR", v: formatAngka(ringkas?.blocked_count ?? statistik.diblokir), h: "IP aktif diblokir" },
					{ k: "GEO-BLOCK", v: data.blocked_countries.length ? data.blocked_countries.join(" ") : "—", h: "negara ditolak" },
				].map((s) => (
					<Stat key={s.k} label={s.k} value={s.v} hint={s.h} />
				))}
			</div>

			{!data.geo?.enabled ? (
				<p className="border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
					Pencarian lokasi IP dimatikan (Pengaturan → Keamanan → Lokasi IP). Globe hanya menampilkan server.
				</p>
			) : data.geo?.last_error ? (
				<p className="border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
					Layanan lokasi IP (ip-api.com) sedang tidak terjangkau: {data.geo.last_error.message}. Data yang sudah tersimpan tetap ditampilkan.
				</p>
			) : data.unresolved > 0 ? (
				<p className="text-[11.5px] text-slate-500">
					<FiRefreshCw className="mr-1 inline h-3 w-3 animate-spin" />
					{data.unresolved} IP sedang dicari lokasinya ({data.geo.queued} di antrean)…
				</p>
			) : null}

			<div className="grid gap-4 xl:grid-cols-12">
				<div className="xl:col-span-8">
					<Card
						title="> globe --live"
						subtitle="Seret untuk memutar · klik titik untuk intel & aksi"
						icon={FiActivity}
						bodyClass="p-0"
						actions={
							<>
								<PilihRentang value={rentang} onChange={setRentang} opsi={RENTANG} />
								<button
									onClick={() => replay.mulai(rentang)}
									disabled={replay.memuat || replayAktif}
									className="inline-flex items-center gap-1 border border-red-200 px-2 py-1 text-[11.5px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-40"
									title="Putar ulang serangan pada rentang ini sebagai time-lapse"
								>
									<FiPlay className="h-3 w-3" /> {replay.memuat ? "memuat…" : "replay"}
								</button>
								<button onClick={muat} className="kali-ikon" title="Muat ulang">
									<FiRefreshCw className="h-3.5 w-3.5" />
								</button>
							</>
						}
					>
						<div className="relative bg-black">
							<HackerGlobe
								ref={globe}
								showStatic={!replayAktif}
								overlay={replayAktif ? <OverlayReplay r={replay} /> : null}
								attackers={data.attackers}
								visitors={data.visitors}
								server={data.server}
								selectedIp={pilih?.ip}
								onSelect={(d, jenis) => setPilih({ ...d, jenis })}
								showArcs={opsi.arcs}
								showVisitors={opsi.visitors}
								autoRotate={opsi.rotate}
								height={tinggiGlobe}
							/>
							<div className="pointer-events-none absolute bottom-2 left-3 space-y-0.5 text-[10.5px] text-slate-500">
								<p><span className="text-red-600">●</span> kritis <span className="ml-2 text-orange-600">●</span> tinggi <span className="ml-2 text-amber-600">●</span> sedang <span className="ml-2 text-slate-400">✕</span> diblokir</p>
								<p><span className="text-emerald-600">●</span> pengunjung <span className="ml-2 text-blue-600">■</span> server</p>
							</div>
						</div>
						<div className="flex flex-wrap gap-x-6 border-t border-slate-100 px-4 py-1">
							<div className="w-44"><Toggle checked={opsi.arcs} onChange={(v) => setOpsi((o) => ({ ...o, arcs: v }))} label="busur serangan" /></div>
							<div className="w-44"><Toggle checked={opsi.visitors} onChange={(v) => setOpsi((o) => ({ ...o, visitors: v }))} label="pengunjung" /></div>
							<div className="w-44"><Toggle checked={opsi.rotate} onChange={(v) => setOpsi((o) => ({ ...o, rotate: v }))} label="putar otomatis" /></div>
							<div className="w-44">
								<Toggle
									checked={opsi.alarm}
									onChange={(v) => {
										// AudioContext hanya boleh dibuat dari gestur pengguna.
										if (v) alarm.current.siapkan();
										setOpsi((o) => ({ ...o, alarm: v }));
									}}
									label="alarm suara"
								/>
							</div>
						</div>
					</Card>
				</div>

				<div className="space-y-4 xl:col-span-4">
					{pilih ? (
						<IntelIp key={pilih.ip} item={pilih} onClose={() => setPilih(null)} onChanged={muat} />
					) : (
						<Card title="> top targets" subtitle="IP paling berbahaya — klik untuk intel" icon={FiCrosshair} bodyClass="p-0">
							<ul className="max-h-[300px] divide-y divide-slate-100 overflow-auto text-[12px]">
								{data.attackers.slice(0, 15).map((a) => (
									<li key={a.ip}>
										<button onClick={() => setPilih({ ...a, jenis: "attacker" })} className="flex w-full items-center gap-2 px-4 py-1.5 text-left hover:bg-slate-50">
											<SeverityBadge severity={a.severity} />
											<span className="w-[120px] shrink-0 truncate text-slate-800">{a.ip}</span>
											<span className="w-6 shrink-0 text-slate-500">{a.geo?.cc || (a.private ? "LAN" : "··")}</span>
											<span className="min-w-0 flex-1 truncate text-slate-500">{a.types.join(", ")}</span>
											<span className={a.blocked ? "text-slate-400 line-through" : "text-slate-700"}>{a.n}</span>
										</button>
									</li>
								))}
								{!data.attackers.length && <li className="px-4 py-6 text-center text-xs text-slate-500">Tidak ada penyerang. Sistem bersih.</li>}
							</ul>
						</Card>
					)}
					<PanelNegara data={data} onChanged={muat} />
				</div>
			</div>

			<UmpanLangsung onPilihIp={pilihIp} onBaru={tembakLangsung} />
		</div>
	);
};

export default ThreatMapTab;
