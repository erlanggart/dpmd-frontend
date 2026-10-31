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
	FiRefreshCw,
	FiSlash,
	FiTerminal,
	FiUnlock,
	FiX,
} from "react-icons/fi";
import api from "../../../../api";
import HackerGlobe from "../HackerGlobe";
import { Card, Galat, Memuat, PilihRentang, SeverityBadge, Toggle, formatAngka, pesanError, sejak, usePolling } from "../serverUi";

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

const UmpanLangsung = ({ onPilihIp }) => {
	const [baris, setBaris] = useState([]);
	const [jeda, setJeda] = useState(false);
	const idTerakhir = useRef(0);
	const barisBaru = useRef(new Set());

	const muat = useCallback(async () => {
		if (jeda) return;
		try {
			const res = await api.get(`${API}/events`, {
				params: { limit: 40, range: "24h", geo: "1", ...(idTerakhir.current ? { since_id: idTerakhir.current } : {}) },
			});
			const data = res.data?.data || [];
			if (!data.length) return;
			idTerakhir.current = Math.max(idTerakhir.current, ...data.map((e) => e.id));
			barisBaru.current = new Set(data.map((e) => e.id));
			setBaris((lama) => [...data, ...lama].slice(0, 120));
		} catch {
			/* umpan diam saja bila gagal; header halaman sudah menandai offline */
		}
	}, [jeda]);

	usePolling(muat, 4000, [jeda]);

	return (
		<Card
			title="> tail -f /var/log/dpmd/security"
			subtitle="Kejadian keamanan masuk secara langsung (tiap 4 detik)"
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

/* ───────────────────────── Tab ───────────────────────── */

const ThreatMapTab = () => {
	const [rentang, setRentang] = useState("24h");
	const [data, setData] = useState(null);
	const [ringkas, setRingkas] = useState(null);
	const [galat, setGalat] = useState(null);
	const [pilih, setPilih] = useState(null);
	const [opsi, setOpsi] = useState({ arcs: true, visitors: true, rotate: true });

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
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
				{[
					{ k: "THREAT LEVEL", v: <span className={t.kelas}>{t.teks}</span>, h: `${ringkas?.last_hour ?? 0} kejadian/jam` },
					{ k: "PENYERANG", v: formatAngka(statistik.penyerang), h: `${statistik.terlokasi} terlokasi` },
					{ k: "NEGARA", v: formatAngka(statistik.negara), h: "asal serangan" },
					{ k: "KEJADIAN", v: formatAngka(statistik.kejadian), h: `${formatAngka(statistik.serius)} serius` },
					{ k: "DIBLOKIR", v: formatAngka(ringkas?.blocked_count ?? statistik.diblokir), h: "IP aktif diblokir" },
					{ k: "GEO-BLOCK", v: data.blocked_countries.length ? data.blocked_countries.join(" ") : "—", h: "negara ditolak" },
				].map((s) => (
					<div key={s.k} className="border border-slate-200 bg-white px-3 py-2.5">
						<p className="text-[10.5px] tracking-[0.18em] text-slate-500">{s.k}</p>
						<p className="kali-glow mt-0.5 truncate text-xl font-extrabold text-slate-900">{s.v}</p>
						<p className="text-[11px] text-slate-500">{s.h}</p>
					</div>
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
								<button onClick={muat} className="kali-ikon" title="Muat ulang">
									<FiRefreshCw className="h-3.5 w-3.5" />
								</button>
							</>
						}
					>
						<div className="relative bg-black">
							<HackerGlobe
								attackers={data.attackers}
								visitors={data.visitors}
								server={data.server}
								selectedIp={pilih?.ip}
								onSelect={(d, jenis) => setPilih({ ...d, jenis })}
								showArcs={opsi.arcs}
								showVisitors={opsi.visitors}
								autoRotate={opsi.rotate}
								height={560}
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

			<UmpanLangsung onPilihIp={pilihIp} />
		</div>
	);
};

export default ThreatMapTab;
