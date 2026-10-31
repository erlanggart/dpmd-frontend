// src/pages/superadmin/server/ServerManagementPage.jsx
//
// Manajemen Server — panel operasi untuk superadmin bertema terminal Kali
// (hijau di atas hitam): peta ancaman global, konsol perintah, kondisi mesin,
// aplikasi & layanan, storage & kuota, database, keamanan (serangan & blokir
// IP), trafik, log, dan pengaturan. Tab aktif disimpan di ?tab= supaya bisa
// dibagikan/ditandai dan tetap setelah muat ulang.
//
// Tema diterapkan lewat kelas .kali-ops (lihat kali.css) yang memetakan ulang
// skala warna Tailwind, jadi tab-tab lama ikut bertema tanpa disunting.

import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
	FiActivity,
	FiBarChart2,
	FiBox,
	FiCheckSquare,
	FiDatabase,
	FiFileText,
	FiGlobe,
	FiHardDrive,
	FiLayers,
	FiRefreshCw,
	FiSettings,
	FiShield,
	FiTerminal,
} from "react-icons/fi";
import api from "../../../api";
import { Memuat, formatBytes, formatDurasi, pesanError, usePolling } from "./serverUi";
import "./kali.css";

const ThreatMapTab = lazy(() => import("./tabs/ThreatMapTab"));
const TerminalTab = lazy(() => import("./tabs/TerminalTab"));
const AuditTab = lazy(() => import("./tabs/AuditTab"));
const OverviewTab = lazy(() => import("./tabs/OverviewTab"));
const ProxmoxTab = lazy(() => import("./tabs/ProxmoxTab"));
const AppsTab = lazy(() => import("./tabs/AppsTab"));
const StorageTab = lazy(() => import("./tabs/StorageTab"));
const DatabaseTab = lazy(() => import("./tabs/DatabaseTab"));
const SecurityTab = lazy(() => import("./tabs/SecurityTab"));
const TrafficTab = lazy(() => import("./tabs/TrafficTab"));
const LogsTab = lazy(() => import("./tabs/LogsTab"));
const SettingsTab = lazy(() => import("./tabs/SettingsTab"));

// Urutan = nomor pintasan Alt+1…9 (lihat useEffect keyboard di bawah).
const TABS = [
	{ key: "peta-ancaman", grup: "PANTAU", label: "Peta Ancaman", icon: FiGlobe, desc: "Asal serangan di seluruh dunia secara langsung. Klik titik untuk intel IP dan memblokir; replay untuk memutar ulang." },
	{ key: "ringkasan", grup: "PANTAU", label: "Ringkasan", icon: FiActivity, desc: "Kondisi mesin, aplikasi, database, dan peringatan aktif dalam satu layar." },
	{ key: "trafik", grup: "PANTAU", label: "Trafik", icon: FiBarChart2, desc: "Jumlah request, rute terlambat, rute error, dan IP paling aktif." },
	{ key: "log", grup: "PANTAU", label: "Log", icon: FiFileText, desc: "Baca log aplikasi, deploy, nginx, dan SSH langsung dari server." },
	{ key: "keamanan", grup: "PERTAHANAN", label: "Keamanan", icon: FiShield, desc: "Jejak serangan lengkap, IP penyerang teratas, dan daftar blokir." },
	{ key: "audit", grup: "PERTAHANAN", label: "Audit", icon: FiCheckSquare, desc: "Periksa celah konfigurasi server (SSH, firewall, port, update, TLS) dan dapatkan perintah perbaikannya." },
	{ key: "terminal", grup: "PERTAHANAN", label: "Terminal", icon: FiTerminal, desc: 'Kendalikan server dengan perintah: blokir IP, restart aplikasi, whois, pantau langsung. Ketik "help".' },
	{ key: "semua-aplikasi", grup: "SISTEM", label: "Semua Aplikasi", icon: FiLayers, desc: "Semua container/VM Proxmox: status, sumber daya, nyalakan/matikan." },
	{ key: "aplikasi", grup: "SISTEM", label: "Proses & Layanan", icon: FiBox, desc: "Proses PM2, layanan systemd, port, dan monitor uptime." },
	{ key: "storage", grup: "SISTEM", label: "Storage", icon: FiHardDrive, desc: "Pemakaian disk, kuota unggahan, dan pembersihan berkas." },
	{ key: "database", grup: "SISTEM", label: "Database", icon: FiDatabase, desc: "Koneksi, query lambat, dan tabel terbesar MySQL." },
	{ key: "pengaturan", grup: "SISTEM", label: "Pengaturan", icon: FiSettings, desc: "Ambang peringatan, kuota, perlindungan, honeypot, dan blokir negara." },
];

/** Hujan karakter ala Matrix di latar header. Ringan: ±20 fps, berhenti saat tersembunyi. */
const HujanMatriks = () => {
	const ref = useRef(null);
	useEffect(() => {
		const cv = ref.current;
		if (!cv || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
		const ctx = cv.getContext("2d");
		const huruf = "アイウエオカキクケコサシスセソタチツテト0123456789ABCDEF<>/{}[]$#@";
		const ukuran = 14;
		let kolom = [];
		let id = 0;
		let aktif = true;
		const ukur = () => {
			cv.width = cv.clientWidth;
			cv.height = cv.clientHeight;
			kolom = Array.from({ length: Math.ceil(cv.width / ukuran) }, () => Math.random() * -40);
		};
		ukur();
		const ro = new ResizeObserver(ukur);
		ro.observe(cv);
		const langkah = () => {
			if (!aktif) return;
			if (document.visibilityState === "visible") {
				ctx.fillStyle = "rgba(2,6,4,0.16)";
				ctx.fillRect(0, 0, cv.width, cv.height);
				ctx.font = `${ukuran}px monospace`;
				kolom.forEach((y, i) => {
					const c = huruf[Math.floor(Math.random() * huruf.length)];
					ctx.fillStyle = Math.random() > 0.975 ? "#d6ffe0" : "#00ff41";
					ctx.fillText(c, i * ukuran, y * ukuran);
					kolom[i] = y * ukuran > cv.height && Math.random() > 0.975 ? 0 : y + 1;
				});
			}
			id = setTimeout(() => requestAnimationFrame(langkah), 50);
		};
		langkah();
		return () => {
			aktif = false;
			clearTimeout(id);
			ro.disconnect();
		};
	}, []);
	return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.22]" aria-hidden="true" />;
};

/** Meter bersegmen: 24 sel bercahaya, kuning ≥75%, merah ≥90%. */
const Meter = ({ label, persen, teks }) => {
	const p = persen === null || persen === undefined ? null : Math.max(0, Math.min(100, persen));
	const isi = p === null ? 0 : Math.round((p / 100) * 24);
	const warna = p === null ? "text-slate-500" : p >= 90 ? "text-red-600" : p >= 75 ? "text-amber-600" : "text-slate-900";
	return (
		<div className="kali-hud min-w-0 px-3 py-2">
			<div className="flex items-baseline justify-between gap-2">
				<span className="kali-hud-label">{label}</span>
				<span className={`kali-display text-xl font-bold tabular-nums [text-shadow:0_0_12px_currentColor] ${warna}`}>{p === null ? "--" : `${Math.round(p)}%`}</span>
			</div>
			<div className={`kali-segmen mt-1.5 ${warna}`} role="meter" aria-label={label} aria-valuenow={p ?? undefined} aria-valuemin={0} aria-valuemax={100}>
				{Array.from({ length: 24 }, (_, i) => (
					<i key={i} className={i < isi ? "on" : ""} />
				))}
			</div>
			<p className="mt-1 truncate text-[10.5px] text-slate-500">{teks || " "}</p>
		</div>
	);
};

/** Kotak angka HUD untuk nilai non-persen (jaringan, aplikasi). */
const Angka = ({ label, nilai, teks }) => (
	<div className="kali-hud min-w-0 px-3 py-2">
		<span className="kali-hud-label">{label}</span>
		<p className="kali-display mt-0.5 truncate text-[15px] font-bold text-slate-900 [text-shadow:0_0_10px_rgba(0,255,65,.5)]">{nilai}</p>
		<p className="mt-0.5 truncate text-[10.5px] text-slate-500">{teks || " "}</p>
	</div>
);

const KetikJudul = ({ teks }) => {
	const [n, setN] = useState(0);
	useEffect(() => {
		setN(0);
		const id = setInterval(() => setN((x) => (x >= teks.length ? x : x + 1)), 28);
		return () => clearInterval(id);
	}, [teks]);
	return <span className="kali-kursor">{teks.slice(0, n)}</span>;
};

const ServerManagementPage = () => {
	const [params, setParams] = useSearchParams();
	const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab") : "peta-ancaman";
	const [overview, setOverview] = useState(null);
	const [galat, setGalat] = useState(null);
	const [terakhir, setTerakhir] = useState(null);
	const [memuat, setMemuat] = useState(false);
	const [jam, setJam] = useState(() => new Date());

	const muat = useCallback(async () => {
		setMemuat(true);
		try {
			const res = await api.get("/superadmin/server/overview");
			setOverview(res.data?.data || null);
			setGalat(null);
			setTerakhir(new Date());
		} catch (error) {
			setGalat(pesanError(error, "Server tidak merespons."));
		} finally {
			setMemuat(false);
		}
	}, []);

	// Ringkasan diperbarui tiap 5 detik — ia juga mengisi header (status &
	// peringatan) di semua tab, jadi tetap berjalan walau tab lain yang dibuka.
	usePolling(muat, 5000);

	useEffect(() => {
		const id = setInterval(() => setJam(new Date()), 1000);
		// Popup SweetAlert dipasang di <body>, di luar .kali-ops.
		document.body.classList.add("kali-swal");
		return () => {
			clearInterval(id);
			document.body.classList.remove("kali-swal");
		};
	}, []);

	const pilihTab = useCallback(
		(key) => {
			const p = new URLSearchParams(params);
			p.set("tab", key);
			setParams(p, { replace: true });
		},
		[params, setParams],
	);

	// Alt+1…9 → pindah tab (urutan TABS). Event.code dipakai supaya tetap
	// jalan di tata letak keyboard yang mengubah Alt+angka menjadi simbol.
	useEffect(() => {
		const onKey = (e) => {
			if (!e.altKey || e.ctrlKey || e.metaKey) return;
			const m = /^Digit([1-9])$/.exec(e.code);
			if (!m) return;
			const t = TABS[Number(m[1]) - 1];
			if (!t) return;
			e.preventDefault();
			pilihTab(t.key);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [pilihTab]);

	const peringatan = overview?.alerts || [];
	const kritis = peringatan.filter((a) => a.level === "critical").length;
	const status = galat ? "offline" : kritis ? "kritis" : peringatan.length ? "waspada" : overview ? "sehat" : "memuat";
	const STATUS = {
		sehat: { teks: "ALL SYSTEMS NOMINAL", kelas: "text-emerald-600 ring-emerald-200 bg-emerald-50" },
		waspada: { teks: `${peringatan.length} WARNING`, kelas: "text-amber-600 ring-amber-200 bg-amber-50" },
		kritis: { teks: `${kritis} CRITICAL`, kelas: "text-red-600 ring-red-200 bg-red-50 animate-pulse" },
		offline: { teks: "SERVER UNREACHABLE", kelas: "text-red-600 ring-red-200 bg-red-50 animate-pulse" },
		memuat: { teks: "CONNECTING…", kelas: "text-slate-500 ring-slate-200 bg-slate-50" },
	}[status];
	const sys = overview?.system;
	const l = overview?.latest;
	const host = sys?.hostname || "dpmd";

	return (
		<div className="kali-ops">
			<div className="mx-auto w-full max-w-[1920px] space-y-4 p-3 pb-10 sm:p-5 lg:p-6">
				{/* Header */}
				<div className="relative overflow-hidden border border-slate-200 bg-black">
					<HujanMatriks />
					<div className="relative p-4 sm:p-5">
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div className="min-w-0">
								<p className="text-[12px] text-slate-500">
									┌──(<span className="text-red-600">root㉿{host}</span>)-[<span className="text-blue-600">~/server-ops</span>]
								</p>
								<p className="text-[12px] text-slate-500">
									└─# <span className="text-slate-800">./dpmd-ops --monitor --defend</span>
								</p>
								<h1 className="kali-display kali-glitch mt-2 text-2xl font-black text-slate-900 sm:text-4xl" data-teks="MANAJEMEN SERVER">
									<KetikJudul teks="MANAJEMEN SERVER" />
								</h1>
								<p className="mt-1 text-[12.5px] text-slate-600">
									{sys ? (
										<>
											<span className="text-slate-800">{sys.hostname}</span> · {sys.distro} · node {sys.node_version} · up {formatDurasi(sys.os_uptime)}
										</>
									) : (
										"Pantau dan pertahankan server secara real-time."
									)}
								</p>
							</div>
							<div className="flex flex-col items-end gap-2">
								<span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11.5px] font-bold tracking-wider ring-1 ${STATUS.kelas}`}>
									<span className="h-1.5 w-1.5 rounded-full bg-current" />
									{STATUS.teks}
								</span>
								<p className="kali-display kali-glow text-2xl font-bold tabular-nums text-slate-900">{jam.toLocaleTimeString("id-ID")}</p>
								<p className="-mt-1.5 text-[10.5px] tracking-[0.2em] text-slate-500">
									{jam.toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
								</p>
								<button
									onClick={muat}
									disabled={memuat}
									className="inline-flex items-center gap-1.5 border border-slate-300 bg-black/60 px-2.5 py-1 text-[11px] text-slate-700 hover:border-slate-900 hover:text-slate-900 disabled:opacity-60"
									title="Perbarui sekarang"
								>
									<FiRefreshCw className={`h-3 w-3 ${memuat ? "animate-spin" : ""}`} />
									{terakhir ? `sync ${terakhir.toLocaleTimeString("id-ID")}` : "sync"}
								</button>
							</div>
						</div>

						<div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
							<Meter label="CPU" persen={l?.cpu} teks={l ? `${sys?.cpu_cores || "-"} core · load ${l.load?.[0]}` : ""} />
							<Meter label="Memori" persen={l?.memory?.percent} teks={l ? `${formatBytes(l.memory?.used)} / ${formatBytes(l.memory?.total)}` : ""} />
							<Meter label="Disk" persen={l?.disk?.percent} teks={l?.disk ? `${formatBytes(l.disk.free)} bebas` : ""} />
							<Angka label="Jaringan" nilai={`↓${formatBytes(l?.network?.rx_rate)}/s`} teks={`↑ ${formatBytes(l?.network?.tx_rate)}/s keluar`} />
							<Angka label="Trafik" nilai={overview ? `${overview.traffic.rpm} rpm` : "--"} teks={overview ? `p95 ${overview.traffic.p95 ?? "-"} ms` : ""} />
							<Angka
								label="Layanan"
								nilai={overview ? `${overview.apps.online}/${overview.apps.total} pm2` : "--"}
								teks={overview ? `database ${overview.database?.connected ? `${overview.database.latency_ms} ms` : "TERPUTUS"}` : ""}
							/>
						</div>
					</div>

					{/* Tab — dikelompokkan supaya mudah dicari */}
					<nav className="relative flex items-stretch overflow-x-auto border-t border-slate-200 bg-black/70 px-2 [scrollbar-width:none]" aria-label="Bagian Manajemen Server">
						{TABS.map((t, i) => {
							const Icon = t.icon;
							const aktif = t.key === tab;
							const lencana = t.key === "ringkasan" && peringatan.length ? peringatan.length : null;
							const grupBaru = i === 0 || TABS[i - 1].grup !== t.grup;
							return (
								<React.Fragment key={t.key}>
									{grupBaru && (
										<span className={`flex shrink-0 items-center pr-1.5 text-[9.5px] font-bold tracking-[0.22em] text-slate-400 ${i ? "ml-2 border-l border-slate-200 pl-3" : "pl-1"}`}>
											{t.grup}
										</span>
									)}
									<button
										onClick={() => pilihTab(t.key)}
										title={`${t.desc}${i < 9 ? ` (Alt+${i + 1})` : ""}`}
										aria-current={aktif ? "page" : undefined}
										className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[12.5px] font-semibold transition ${
											aktif ? "border-slate-900 bg-slate-100 text-slate-900" : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
										}`}
									>
										<Icon className="h-3.5 w-3.5" />
										{t.label}
										{lencana && (
											<span className={`px-1.5 text-[10.5px] font-bold ${kritis ? "bg-red-500 text-white" : "bg-amber-400 text-amber-950"}`}>{lencana}</span>
										)}
										{i < 9 && <span className="kali-kbd hidden xl:inline-grid">{i + 1}</span>}
									</button>
								</React.Fragment>
							);
						})}
					</nav>
				</div>

				{/* Lokasi + penjelasan singkat tab aktif */}
				<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1 text-[12px]">
					<span className="text-slate-500">
						~/server-ops/<span className="font-bold text-slate-900">{tab}</span>$
					</span>
					<span className="text-slate-600">{TABS.find((t) => t.key === tab)?.desc}</span>
					<span className="ml-auto hidden text-[11px] text-slate-400 lg:inline">Alt+1…9 pindah tab</span>
				</div>

				{galat && overview && (
					<div className="flex items-center gap-2 border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12.5px] text-amber-800">
						[!] Gagal memperbarui ({galat}). Menampilkan data terakhir.
					</div>
				)}

				<Suspense fallback={<Memuat />}>
					{tab === "peta-ancaman" && <ThreatMapTab />}
					{tab === "terminal" && <TerminalTab onNavigate={pilihTab} />}
					{tab === "audit" && <AuditTab />}
					{tab === "ringkasan" && <OverviewTab data={overview} galat={!overview ? galat : null} onRetry={muat} onNavigate={pilihTab} />}
					{tab === "semua-aplikasi" && <ProxmoxTab />}
					{tab === "aplikasi" && <AppsTab />}
					{tab === "storage" && <StorageTab />}
					{tab === "database" && <DatabaseTab />}
					{tab === "keamanan" && <SecurityTab />}
					{tab === "trafik" && <TrafficTab />}
					{tab === "log" && <LogsTab />}
					{tab === "pengaturan" && <SettingsTab />}
				</Suspense>
			</div>
		</div>
	);
};

export default ServerManagementPage;
