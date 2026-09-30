// Tab Ringkasan — kesehatan server sekilas: peringatan aktif, meter
// CPU/RAM/Disk/Kuota, angka kunci, grafik riwayat, aplikasi, dan info mesin.

import React, { useEffect, useState } from "react";
import {
	FiActivity,
	FiAlertOctagon,
	FiAlertTriangle,
	FiArrowDown,
	FiArrowUp,
	FiBox,
	FiCheckCircle,
	FiClock,
	FiCpu,
	FiDatabase,
	FiGlobe,
	FiInfo,
	FiServer,
	FiUsers,
	FiZap,
} from "react-icons/fi";
import api from "../../../../api";
import {
	Card,
	Gauge,
	Galat,
	GrafikArea,
	Legenda,
	Memuat,
	PilihRentang,
	SERI,
	Stat,
	StatusBadge,
	formatAngka,
	formatBytes,
	formatDurasi,
	formatRate,
	formatWaktu,
	sejak,
} from "../serverUi";

const RENTANG = [
	{ value: "1h", label: "1 jam" },
	{ value: "6h", label: "6 jam" },
	{ value: "24h", label: "24 jam" },
	{ value: "7d", label: "7 hari" },
	{ value: "30d", label: "30 hari" },
];

const IKON_LEVEL = { critical: FiAlertOctagon, warning: FiAlertTriangle, info: FiInfo };

const PanelPeringatan = ({ alerts, onNavigate }) => {
	if (!alerts.length) {
		return (
			<div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
				<FiCheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
				<div>
					<p className="text-sm font-bold text-emerald-900">Semua sistem berjalan normal</p>
					<p className="text-xs text-emerald-700">Tidak ada peringatan aktif. Sistem memeriksa ulang setiap 10 detik.</p>
				</div>
			</div>
		);
	}
	const tujuan = { keamanan: "keamanan", storage: "storage", database: "database", aplikasi: "aplikasi", layanan: "aplikasi", uptime: "aplikasi", ssl: "aplikasi", proxmox: "semua-aplikasi" };
	return (
		<div className="space-y-2">
			{alerts.map((a) => {
				const Icon = IKON_LEVEL[a.level] || FiInfo;
				const kritis = a.level === "critical";
				return (
					<div
						key={a.key}
						className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${kritis ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}
					>
						<Icon className={`mt-0.5 h-5 w-5 shrink-0 ${kritis ? "text-red-600" : "text-amber-600"}`} />
						<div className="min-w-0 flex-1">
							<p className={`text-sm font-bold ${kritis ? "text-red-900" : "text-amber-900"}`}>
								{a.title} <span className="ml-1 text-[11px] font-semibold opacity-70">· {kritis ? "Kritis" : "Waspada"} · sejak {sejak(a.since)} lalu</span>
							</p>
							<p className={`mt-0.5 text-[12.5px] ${kritis ? "text-red-800" : "text-amber-800"}`}>{a.message}</p>
						</div>
						{tujuan[a.kategori] && (
							<button
								onClick={() => onNavigate(tujuan[a.kategori])}
								className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
							>
								Lihat
							</button>
						)}
					</div>
				);
			})}
		</div>
	);
};

const OverviewTab = ({ data, galat, onRetry, onNavigate }) => {
	const [rentang, setRentang] = useState("1h");
	const [riwayat, setRiwayat] = useState(null);

	useEffect(() => {
		if (rentang === "1h") {
			setRiwayat(null);
			return undefined;
		}
		let batal = false;
		const muat = () =>
			api
				.get("/superadmin/server/history", { params: { range: rentang } })
				.then((r) => !batal && setRiwayat(r.data?.data?.points || []))
				.catch(() => !batal && setRiwayat([]));
		muat();
		const id = setInterval(muat, 60000);
		return () => {
			batal = true;
			clearInterval(id);
		};
	}, [rentang]);

	if (galat) return <Galat pesan={galat} onRetry={onRetry} />;
	if (!data) return <Memuat />;

	const l = data.latest;
	const titik = rentang === "1h" ? data.history : riwayat || [];
	const jangka = rentang === "7d" || rentang === "30d";
	const tick = jangka ? (t) => new Date(t).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) : undefined;
	const labelFmt = jangka ? (t) => formatWaktu(t) : undefined;
	const q = data.storage_quota;
	const titikReq = titik.map((p) => ({ ...p, rpm: p.rps !== undefined ? Math.round(p.rps * 60) : p.requests }));

	return (
		<div className="space-y-4">
			<PanelPeringatan alerts={data.alerts} onNavigate={onNavigate} />

			{/* Meter */}
			<Card title="Pemakaian Sumber Daya" subtitle="Nilai saat ini, diperbarui tiap 5 detik" icon={FiCpu}>
				{!l ? (
					<Memuat teks="Menunggu sampel pertama (±10 detik setelah server menyala)…" />
				) : (
					<div className="grid grid-cols-2 gap-5 md:grid-cols-4">
						<Gauge value={l.cpu} label="CPU" detail={`${l.cores} core · load ${l.load.join(" / ")}`} ambang={85} />
						<Gauge
							value={l.memory.percent}
							label="RAM"
							detail={`${formatBytes(l.memory.used)} / ${formatBytes(l.memory.total)}`}
							ambang={90}
							warna={SERI.ungu}
						/>
						<Gauge
							value={l.disk?.percent ?? null}
							label="Disk"
							detail={l.disk ? `${formatBytes(l.disk.used)} / ${formatBytes(l.disk.total)}` : "Tidak terbaca"}
							ambang={85}
							warna={SERI.aqua}
						/>
						{q?.quota_bytes ? (
							<Gauge
								value={q.percent}
								label="Kuota Storage"
								detail={`${formatBytes(q.used_bytes)} / ${formatBytes(q.quota_bytes)}`}
								ambang={q.warn_percent}
								warna={SERI.oranye}
							/>
						) : (
							<Gauge
								value={l.memory.swap_total ? (l.memory.swap_used / l.memory.swap_total) * 100 : 0}
								label="Swap"
								detail={l.memory.swap_total ? `${formatBytes(l.memory.swap_used)} / ${formatBytes(l.memory.swap_total)}` : "Tidak ada swap"}
								ambang={60}
								warna={SERI.oranye}
							/>
						)}
					</div>
				)}
			</Card>

			{/* Angka kunci */}
			{l && (
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					<Stat icon={FiZap} tone="blue" label="Request / menit" value={formatAngka(data.traffic.rpm)} hint={`p95 respons ${data.traffic.p95} ms`} />
					<Stat
						icon={FiArrowDown}
						tone="green"
						label="Jaringan masuk"
						value={formatRate(l.network.rx_rate)}
						hint={<span className="inline-flex items-center gap-1"><FiArrowUp className="h-3 w-3" /> keluar {formatRate(l.network.tx_rate)}</span>}
					/>
					<Stat icon={FiUsers} tone="violet" label="Koneksi realtime" value={formatAngka(l.online)} hint="Socket aktif (chat, meeting, notifikasi)" />
					<Stat
						icon={FiDatabase}
						tone={data.database?.connected === false ? "red" : "amber"}
						label="Database"
						value={data.database?.connected === false ? "Terputus" : data.database?.connected ? `${data.database.latency_ms} ms` : "–"}
						hint={data.database?.size ? `${formatBytes(data.database.size.total)} · ${data.database.connections?.current ?? "-"} koneksi` : "Latensi query"}
					/>
					<Stat icon={FiServer} label="Memori backend" value={formatBytes(l.process.rss)} hint={`Heap ${formatBytes(l.process.heap_used)} · CPU ${l.process.cpu}%`} />
					<Stat
						icon={FiActivity}
						tone={l.event_loop.p99 > 100 ? "amber" : "slate"}
						label="Event loop"
						value={`${l.event_loop.p99} ms`}
						hint="Keterlambatan p99 — makin kecil makin responsif"
					/>
					<Stat icon={FiClock} label="Backend aktif" value={formatDurasi(l.process.uptime)} hint={`PID ${l.process.pid}`} />
					<Stat
						icon={FiBox}
						tone={data.apps.pm2_available && data.apps.online < data.apps.total ? "red" : "green"}
						label="Aplikasi PM2"
						value={data.apps.pm2_available ? `${data.apps.online}/${data.apps.total} online` : "–"}
						hint={data.apps.pm2_available ? "Proses yang dikelola PM2" : "PM2 tidak terdeteksi"}
					/>
				</div>
			)}

			{/* Grafik */}
			<Card
				title="Riwayat Kinerja"
				subtitle={rentang === "1h" ? "Sampel tiap 10 detik (dari memori)" : "Rata-rata tersimpan di database"}
				icon={FiActivity}
				actions={<PilihRentang value={rentang} onChange={setRentang} opsi={RENTANG} />}
			>
				{rentang !== "1h" && riwayat === null ? (
					<Memuat teks="Memuat riwayat…" />
				) : !titik.length ? (
					<p className="py-8 text-center text-sm text-slate-500">
						Belum ada riwayat untuk rentang ini. Snapshot disimpan tiap 5 menit sejak fitur ini aktif.
					</p>
				) : (
					<div className="grid gap-6 lg:grid-cols-2">
						<div>
							<p className="mb-1 text-[13px] font-bold text-slate-700">CPU (%)</p>
							<GrafikArea data={titik} series={[{ key: "cpu", name: "CPU", color: SERI.biru }]} satuan="%" domain={[0, 100]} tickFormat={tick} labelFormat={labelFmt} />
						</div>
						<div>
							<p className="mb-1 text-[13px] font-bold text-slate-700">RAM (%)</p>
							<GrafikArea data={titik} series={[{ key: "memory", name: "RAM", color: SERI.ungu }]} satuan="%" domain={[0, 100]} tickFormat={tick} labelFormat={labelFmt} />
						</div>
						<div>
							<p className="mb-1 text-[13px] font-bold text-slate-700">{rentang === "1h" ? "Request per menit" : "Jumlah request"}</p>
							<GrafikArea
								data={titikReq}
								series={[{ key: rentang === "1h" ? "rpm" : "requests", name: "Request", color: SERI.aqua }]}
								format={(v) => formatAngka(Math.round(v))}
								tickFormat={tick}
								labelFormat={labelFmt}
							/>
						</div>
						<div>
							<p className="mb-1 text-[13px] font-bold text-slate-700">Waktu respons rata-rata (ms)</p>
							<GrafikArea data={titik} series={[{ key: "avg_ms", name: "Respons", color: SERI.oranye }]} satuan=" ms" tickFormat={tick} labelFormat={labelFmt} />
						</div>
						<div>
							<div className="mb-1 flex flex-wrap items-center justify-between gap-2">
								<p className="text-[13px] font-bold text-slate-700">Lalu lintas jaringan</p>
								<Legenda items={[{ label: "Masuk", color: SERI.biru }, { label: "Keluar", color: SERI.oranye }]} />
							</div>
							<GrafikArea
								data={titik}
								series={[
									{ key: "rx", name: "Masuk", color: SERI.biru },
									{ key: "tx", name: "Keluar", color: SERI.oranye },
								]}
								format={formatRate}
								tickFormat={tick}
								labelFormat={labelFmt}
							/>
						</div>
						<div>
							<p className="mb-1 text-[13px] font-bold text-slate-700">Koneksi realtime</p>
							<GrafikArea data={titik} series={[{ key: "online", name: "Online", color: SERI.magenta }]} format={(v) => formatAngka(Math.round(v))} tickFormat={tick} labelFormat={labelFmt} />
						</div>
					</div>
				)}
			</Card>

			<div className="grid gap-4 lg:grid-cols-2">
				{/* Aplikasi & monitor */}
				<Card
					title="Aplikasi & Website"
					subtitle="Proses PM2 dan monitor uptime"
					icon={FiGlobe}
					actions={
						<button onClick={() => onNavigate("aplikasi")} className="text-xs font-semibold text-blue-600 hover:underline">
							Kelola →
						</button>
					}
				>
					<div className="space-y-2">
						{data.apps.processes.map((p) => (
							<div key={p.name} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
								<div className="flex min-w-0 items-center gap-2">
									<FiBox className="h-4 w-4 shrink-0 text-slate-500" />
									<span className="truncate text-sm font-semibold text-slate-700">{p.name}</span>
									{p.is_self && <span className="rounded bg-blue-100 px-1.5 text-[10px] font-bold text-blue-700">INI</span>}
								</div>
								<div className="flex shrink-0 items-center gap-3 text-xs text-slate-500">
									<span>CPU {p.cpu}%</span>
									<span>{formatBytes(p.memory)}</span>
									<StatusBadge tingkat={p.status === "online" ? "baik" : "kritis"} label={p.status} />
								</div>
							</div>
						))}
						{data.monitors.map((m) => (
							<div key={m.url} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
								<div className="min-w-0">
									<p className="truncate text-sm font-semibold text-slate-700">{m.name}</p>
									<p className="truncate text-[11px] text-slate-500">{m.url}</p>
								</div>
								<div className="flex shrink-0 items-center gap-3 text-xs text-slate-500">
									{m.ms !== null && <span>{m.ms} ms</span>}
									{m.uptime_percent !== null && <span>{m.uptime_percent}% uptime</span>}
									<StatusBadge tingkat={m.up === null ? "netral" : m.up ? "baik" : "kritis"} label={m.up === null ? "Menunggu" : m.up ? "Online" : "Down"} />
								</div>
							</div>
						))}
						{!data.apps.processes.length && !data.monitors.length && (
							<p className="py-4 text-center text-sm text-slate-500">Belum ada aplikasi terdeteksi.</p>
						)}
					</div>
				</Card>

				{/* Info mesin */}
				<Card title="Informasi Server" icon={FiServer}>
					<dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-2">
						{[
							["Hostname", data.system.hostname],
							["Sistem operasi", data.system.distro],
							["Kernel", data.system.kernel],
							["Arsitektur", data.system.arch],
							["Prosesor", data.system.cpu_model],
							["Jumlah core", data.system.cpu_cores],
							["Total RAM", formatBytes(data.system.total_memory)],
							["Node.js", data.system.node_version],
							["Mode", data.system.env],
							["Zona waktu", data.system.timezone],
							["Server menyala", formatDurasi(data.system.os_uptime)],
							["Backend dimulai", formatWaktu(data.system.app_started_at)],
							["Alamat IP", data.system.ip_addresses.map((i) => i.address).join(", ") || "-"],
						].map(([k, v]) => (
							<div key={k} className="flex justify-between gap-3 border-b border-slate-100 pb-1.5 sm:block sm:border-0 sm:pb-0">
								<dt className="text-slate-500">{k}</dt>
								<dd className="truncate text-right font-semibold text-slate-800 sm:text-left" title={String(v)}>
									{v}
								</dd>
							</div>
						))}
					</dl>
				</Card>
			</div>

			{/* Riwayat peringatan */}
			<Card title="Riwayat Peringatan" subtitle="Sejak backend terakhir dijalankan" icon={FiClock}>
				{!data.alert_history.length ? (
					<p className="py-4 text-center text-sm text-slate-500">Belum ada peringatan tercatat.</p>
				) : (
					<ol className="relative space-y-3 border-l border-slate-200 pl-4">
						{data.alert_history.map((a, i) => (
							<li key={`${a.key}-${i}`} className="relative">
								<span
									className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
										a.status === "pulih" ? "bg-emerald-500" : a.level === "critical" ? "bg-red-500" : "bg-amber-500"
									}`}
								/>
								<p className="text-[13px] font-semibold text-slate-800">
									{a.status === "pulih" ? "Pulih: " : ""}
									{a.title}
									<span className="ml-2 text-[11px] font-normal text-slate-500">{formatWaktu(a.at, { second: "2-digit" })}</span>
								</p>
								<p className="text-xs text-slate-500">{a.message}</p>
							</li>
						))}
					</ol>
				)}
			</Card>
		</div>
	);
};

export default OverviewTab;
