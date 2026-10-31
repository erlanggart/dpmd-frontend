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
const OverviewTab = lazy(() => import("./tabs/OverviewTab"));
const ProxmoxTab = lazy(() => import("./tabs/ProxmoxTab"));
const AppsTab = lazy(() => import("./tabs/AppsTab"));
const StorageTab = lazy(() => import("./tabs/StorageTab"));
const DatabaseTab = lazy(() => import("./tabs/DatabaseTab"));
const SecurityTab = lazy(() => import("./tabs/SecurityTab"));
const TrafficTab = lazy(() => import("./tabs/TrafficTab"));
const LogsTab = lazy(() => import("./tabs/LogsTab"));
const SettingsTab = lazy(() => import("./tabs/SettingsTab"));

const TABS = [
	{ key: "peta-ancaman", label: "Peta Ancaman", icon: FiGlobe },
	{ key: "terminal", label: "Terminal", icon: FiTerminal },
	{ key: "ringkasan", label: "Ringkasan", icon: FiActivity },
	{ key: "semua-aplikasi", label: "Semua Aplikasi", icon: FiLayers },
	{ key: "aplikasi", label: "Proses & Layanan", icon: FiBox },
	{ key: "storage", label: "Storage", icon: FiHardDrive },
	{ key: "database", label: "Database", icon: FiDatabase },
	{ key: "keamanan", label: "Keamanan", icon: FiShield },
	{ key: "trafik", label: "Trafik", icon: FiBarChart2 },
	{ key: "log", label: "Log", icon: FiFileText },
	{ key: "pengaturan", label: "Pengaturan", icon: FiSettings },
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

/** Meter ASCII: CPU [██████░░░░] 61% */
const Meter = ({ label, persen, teks }) => {
	const p = persen === null || persen === undefined ? null : Math.max(0, Math.min(100, persen));
	const isi = p === null ? 0 : Math.round(p / 10);
	const warna = p === null ? "text-slate-500" : p >= 90 ? "text-red-600" : p >= 75 ? "text-amber-600" : "text-slate-900";
	return (
		<div className="min-w-0 whitespace-nowrap text-[12px]">
			<span className="text-slate-500">{label} </span>
			<span className={warna}>
				[{"█".repeat(isi)}
				<span className="text-slate-300">{"░".repeat(10 - isi)}</span>]
			</span>{" "}
			<span className="font-bold text-slate-800">{p === null ? "--" : `${Math.round(p)}%`}</span>
			{teks && <span className="ml-1 text-[11px] text-slate-500">{teks}</span>}
		</div>
	);
};

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
								<h1 className="kali-glow mt-2 text-2xl font-extrabold tracking-wider text-slate-900 sm:text-3xl">
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
								<p className="kali-glow text-lg font-bold tabular-nums text-slate-900">{jam.toLocaleTimeString("id-ID")}</p>
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

						<div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 border-t border-slate-200 pt-3 sm:grid-cols-2 xl:grid-cols-5">
							<Meter label="CPU " persen={l?.cpu} teks={l ? `load ${l.load?.[0]}` : ""} />
							<Meter label="MEM " persen={l?.memory?.percent} teks={l ? formatBytes(l.memory?.used) : ""} />
							<Meter label="DISK" persen={l?.disk?.percent} teks={l?.disk ? `${formatBytes(l.disk.free)} free` : ""} />
							<div className="whitespace-nowrap text-[12px]">
								<span className="text-slate-500">NET </span>
								<span className="text-slate-800">↓{formatBytes(l?.network?.rx_rate)}/s ↑{formatBytes(l?.network?.tx_rate)}/s</span>
							</div>
							<div className="whitespace-nowrap text-[12px]">
								<span className="text-slate-500">APP </span>
								<span className="text-slate-800">
									{overview ? `${overview.apps.online}/${overview.apps.total} pm2 · ${overview.traffic.rpm} rpm · db ${overview.database?.connected ? `${overview.database.latency_ms}ms` : "DOWN"}` : "--"}
								</span>
							</div>
						</div>
					</div>

					{/* Tab */}
					<nav className="relative flex gap-0.5 overflow-x-auto border-t border-slate-200 bg-black/70 px-2 [scrollbar-width:none]">
						{TABS.map((t) => {
							const Icon = t.icon;
							const aktif = t.key === tab;
							const lencana = t.key === "ringkasan" && peringatan.length ? peringatan.length : null;
							return (
								<button
									key={t.key}
									onClick={() => pilihTab(t.key)}
									className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[12.5px] font-semibold transition ${
										aktif ? "border-slate-900 bg-slate-100 text-slate-900" : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
									}`}
								>
									<Icon className="h-3.5 w-3.5" />
									{aktif ? `[ ${t.label} ]` : t.label}
									{lencana && (
										<span className={`px-1.5 text-[10.5px] font-bold ${kritis ? "bg-red-500 text-white" : "bg-amber-400 text-amber-950"}`}>{lencana}</span>
									)}
								</button>
							);
						})}
					</nav>
				</div>

				{galat && overview && (
					<div className="flex items-center gap-2 border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12.5px] text-amber-800">
						[!] Gagal memperbarui ({galat}). Menampilkan data terakhir.
					</div>
				)}

				<Suspense fallback={<Memuat />}>
					{tab === "peta-ancaman" && <ThreatMapTab />}
					{tab === "terminal" && <TerminalTab onNavigate={pilihTab} />}
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
