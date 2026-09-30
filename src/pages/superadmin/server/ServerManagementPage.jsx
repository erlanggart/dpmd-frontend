// src/pages/superadmin/server/ServerManagementPage.jsx
//
// Manajemen Server — panel ala hosting untuk superadmin: kondisi mesin,
// aplikasi & layanan, storage & kuota, database, keamanan (serangan & blokir
// IP), trafik, log, dan pengaturan. Tab aktif disimpan di ?tab= supaya bisa
// dibagikan/ditandai dan tetap setelah muat ulang.

import React, { lazy, Suspense, useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
	FiActivity,
	FiAlertOctagon,
	FiAlertTriangle,
	FiBarChart2,
	FiBox,
	FiCheckCircle,
	FiDatabase,
	FiFileText,
	FiHardDrive,
	FiLayers,
	FiRefreshCw,
	FiServer,
	FiSettings,
	FiShield,
} from "react-icons/fi";
import api from "../../../api";
import { Memuat, formatDurasi, pesanError, usePolling } from "./serverUi";

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

const ServerManagementPage = () => {
	const [params, setParams] = useSearchParams();
	const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab") : "ringkasan";
	const [overview, setOverview] = useState(null);
	const [galat, setGalat] = useState(null);
	const [terakhir, setTerakhir] = useState(null);
	const [memuat, setMemuat] = useState(false);

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

	const pilihTab = (key) => {
		const p = new URLSearchParams(params);
		p.set("tab", key);
		setParams(p, { replace: true });
	};

	const peringatan = overview?.alerts || [];
	const kritis = peringatan.filter((a) => a.level === "critical").length;
	const status = galat ? "offline" : kritis ? "kritis" : peringatan.length ? "waspada" : overview ? "sehat" : "memuat";
	const STATUS = {
		sehat: { teks: "Semua sistem normal", kelas: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30", icon: FiCheckCircle },
		waspada: { teks: `${peringatan.length} peringatan aktif`, kelas: "bg-amber-500/15 text-amber-300 ring-amber-400/30", icon: FiAlertTriangle },
		kritis: { teks: `${kritis} masalah kritis`, kelas: "bg-red-500/20 text-red-300 ring-red-400/40", icon: FiAlertOctagon },
		offline: { teks: "Server tidak merespons", kelas: "bg-red-500/20 text-red-300 ring-red-400/40", icon: FiAlertOctagon },
		memuat: { teks: "Memeriksa…", kelas: "bg-white/10 text-slate-300 ring-white/20", icon: FiRefreshCw },
	}[status];
	const StatusIcon = STATUS.icon;
	const sys = overview?.system;

	return (
		<div className="mx-auto w-full max-w-[1920px] space-y-4 p-3 pb-10 sm:p-5 lg:p-6">
			{/* Header */}
			<div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white shadow-lg">
				<div className="flex flex-wrap items-start justify-between gap-4 p-5">
					<div className="flex min-w-0 items-start gap-3">
						<span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10">
							<FiServer className="h-5 w-5" />
						</span>
						<div className="min-w-0">
							<h1 className="text-xl font-bold">Manajemen Server</h1>
							<p className="mt-0.5 text-sm text-slate-300">
								{sys ? (
									<>
										<span className="font-semibold text-white">{sys.hostname}</span> · {sys.distro} · Node {sys.node_version} ·
										aktif {formatDurasi(sys.os_uptime)}
									</>
								) : (
									"Pantau kondisi server, aplikasi, storage, dan keamanan secara real-time."
								)}
							</p>
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${STATUS.kelas}`}>
							<StatusIcon className={`h-3.5 w-3.5 ${status === "memuat" ? "animate-spin" : ""}`} />
							{STATUS.teks}
						</span>
						<button
							onClick={muat}
							disabled={memuat}
							className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15 disabled:opacity-60"
							title="Perbarui sekarang"
						>
							<FiRefreshCw className={`h-3.5 w-3.5 ${memuat ? "animate-spin" : ""}`} />
							{terakhir ? `Diperbarui ${terakhir.toLocaleTimeString("id-ID")}` : "Perbarui"}
						</button>
					</div>
				</div>

				{/* Tab */}
				<nav className="flex gap-1 overflow-x-auto border-t border-white/10 px-3 pt-2 [scrollbar-width:none]">
					{TABS.map((t) => {
						const Icon = t.icon;
						const aktif = t.key === tab;
						const lencana = t.key === "ringkasan" && peringatan.length ? peringatan.length : null;
						return (
							<button
								key={t.key}
								onClick={() => pilihTab(t.key)}
								className={`inline-flex shrink-0 items-center gap-1.5 rounded-t-lg px-3 py-2 text-[13px] font-semibold transition ${
									aktif ? "bg-slate-50 text-slate-900" : "text-slate-300 hover:bg-white/5 hover:text-white"
								}`}
							>
								<Icon className="h-4 w-4" />
								{t.label}
								{lencana && (
									<span className={`rounded-full px-1.5 text-[10.5px] font-bold ${kritis ? "bg-red-500 text-white" : "bg-amber-400 text-amber-950"}`}>
										{lencana}
									</span>
								)}
							</button>
						);
					})}
				</nav>
			</div>

			{galat && overview && (
				<div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800">
					<FiAlertTriangle className="h-4 w-4 shrink-0" />
					Gagal memperbarui ({galat}). Menampilkan data terakhir.
				</div>
			)}

			<Suspense fallback={<Memuat />}>
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
	);
};

export default ServerManagementPage;
